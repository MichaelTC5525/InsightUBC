import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";
import * as fs from "fs-extra";
import JSZip from "jszip";
import FSOperator from "../helper/FSOperator";
import { DatasetEntry } from "../storageType/DatasetEntry";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	private datasetStorage: InsightDataset[];
	private datasetEntries: DatasetEntry[];
	private dataFolder: string = "./data";


	/**
	 * On creating a new InsightFacade instance, we should read the ./data file system directory
	 * in order to ensure that we reload any existing datasets and course sections that were left from
	 * a previous instance of the class
	 */
	constructor() {
		console.trace("InsightFacadeImpl::init()");
		this.datasetStorage = [];
		this.datasetEntries = [];

		if (!fs.existsSync(this.dataFolder)) {
			fs.mkdirSync(this.dataFolder);
		}
		let fileNames: string[] = fs.readdirSync(this.dataFolder);
		for (let name in fileNames) {
			fs.readFile(name, (error, data) => {
				// Parse data, grabbing each entry of { } as one row and courseSection object
				let lines = data.toString().split("\n");

				if (lines[0] === "courses") {
					let courseSet: InsightDataset = {
						id: name,
						kind: InsightDatasetKind.Courses,
						numRows: lines.length - 1
					};
					this.datasetStorage.push(courseSet);
				} else if (lines[0] === "rooms") {
					let roomSet = {
						id: name,
						kind: InsightDatasetKind.Rooms,
						numRows: lines.length - 1
					};
					this.datasetStorage.push(roomSet);
				}
			});
		}
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		if (!this.baseValidateDataset(id, content)) {
			return Promise.reject(new InsightError("Dataset ID or content invalid"));
		}

		let currSets: string[] = [];
		let rows: number = 0;
		// Grab the dataset ids that are already in the database
		for (let dataset of this.datasetStorage) {
			currSets.push(dataset.id);
		}

		// Read in the .ZIP file
		let zip = new JSZip();
		let datasetContent: DatasetEntry[] = [];
		let read = zip.loadAsync(content, {base64: true}).then((contentZip) => {
			datasetContent = this.findRows(contentZip, id);
			rows = datasetContent.length;
			let fileContent: string = this.makeFileContents(datasetContent, kind);
			fs.writeFile("./data/${id}.txt", fileContent, () => {
				// Create an InsightDataset object to track high-level information of the dataset being added
				let newDataset: InsightDataset = {
					id: id,	kind: kind,	numRows: rows
				};
				this.datasetStorage.push(newDataset);
				currSets.push(id);
			});
			return Promise.resolve();
		})
			.catch((error) => {
				// Remove file if it was created
				fs.removeSync("./data/${id}.txt");
				return Promise.reject(error);
			});

		return new Promise((resolve, reject) => {
			Promise.all([read]).then(() => {
				resolve(currSets);
			}).catch((e) => {
				// Perpetuate error message to outside for specific reason of fail
				reject(e);
			});
		});
	}

	public removeDataset(id: string): Promise<string> {
		return Promise.reject("Not implemented.");
	}

	public performQuery(query: any): Promise<any[]> {
		return Promise.reject("Not implemented.");
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.resolve(this.datasetStorage);
	}


	private baseValidateDataset(id: string, content: string): boolean {
		// Validate ID string using basic format scheme; Sanity check base64 characters in content string
		// base64 regex pattern from StackOverflow https://stackoverflow.com/questions/8571501/how-to-check-whether-a-string-is-base64-encoded-or-not
		if (!id.match(/^[^_]+$/) || id.match(/\s+/) ||
			!content.match(/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/)) {
			return false;
		}

		return true;
	}

	private findRows(contentZip: JSZip, id: string): DatasetEntry[] {
		let fsOp = new FSOperator();
		let sections = fsOp.getValidRows("courses", contentZip, id);
		// May require functionality for Rooms in later iterations; please leave in
		let rooms = fsOp.getValidRows("rooms", contentZip, id);
		let rows: number = sections.length + rooms.length;
		if (rows === 0) {
			throw new InsightError("Zip folder is empty or does not contain 'courses' nor 'rooms'.");
		}

		if (sections.length === 0) {
			return rooms;
		} else {
			return sections;
		}
	}

	private makeFileContents(content: DatasetEntry[], kind: InsightDatasetKind): string {
		let entries: string = "";
		if (kind === InsightDatasetKind.Courses) {
			entries += "courses\n";
		} else if (kind === InsightDatasetKind.Rooms) {
			entries += "rooms\n";
		} else {
			throw new InsightError("Invalid dataset kind requested");
		}
		for (let c of content) {
			entries += (c + "\n");
		}
		return entries;
	}
}
