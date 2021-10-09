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
	private readonly datasetStorage: InsightDataset[];
	private datasetEntries: DatasetEntry[];
	private dataFolder: string = "./data";
	/**
	 * On creating a new InsightFacade instance, we should read the ./data file system directory
	 * in order to ensure that we reload any existing datasets that were left from a previous
	 * instance of the class
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
			let fileContent: Buffer = fs.readFileSync(name);
			let lines = fileContent.toString().split("\n");

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
		// let datasetContent: DatasetEntry[] = [];
		return zip.loadAsync(content, {base64: true}).then((contentZip) => {
			return this.findRows(contentZip, id);
		}).then((entryArray) => {
			let fileContent: string = this.makeFileContents(entryArray, kind);
			fs.writeFileSync("./data/" + id + ".txt", fileContent);
			// Create an InsightDataset object to track high-level information of the dataset being added
			let newDataset: InsightDataset = {
				id: id, kind: kind, numRows: rows
			};
			this.datasetStorage.push(newDataset);
			currSets.push(id);
			return Promise.resolve(currSets);
		}).catch((error) => {
			return Promise.reject(error);
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

	private findRows(contentZip: JSZip, id: string): Promise<DatasetEntry[]> {
		let fsOp = new FSOperator();
		let totalRows: number = 0;
		let sections: number = 0;
		let rooms: number = 0;
		let retArray: DatasetEntry[] = [];
		return fsOp.getValidRows("courses", contentZip, id).then((array) => {
			totalRows += array.length;
			sections = array.length;
			if (sections !== 0) {
				retArray = array;
			}
			retArray = array;
		}).then(() => {
			fsOp.getValidRows("rooms", contentZip, id).then((array) => {
				totalRows += array.length;
				rooms = array.length;
				if (rooms !== 0) {
					retArray = array;
				}
			});
		}).then(() => {
			if (totalRows === 0) {
				throw new InsightError("Zip folder is empty or does not contain 'courses' nor 'rooms'.");
			}
			return retArray;
		});
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
