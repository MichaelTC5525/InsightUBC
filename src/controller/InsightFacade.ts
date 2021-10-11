import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	NotFoundError,
	ResultTooLargeError
} from "./IInsightFacade";
import * as fs from "fs-extra";
import JSZip from "jszip";
import DatasetZipReader from "../helper/DatasetZipReader";
import FSOperator from "../helper/FSOperator";
import QueryOperator from "../helper/QueryOperator";
import { DatasetEntry } from "../storageType/DatasetEntry";
import CourseSection from "../storageType/CourseSection";
import Room from "../storageType/Room";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	private readonly datasetStorage: InsightDataset[];
	private datasetEntries: DatasetEntry[];
	private dataFolder: string = "./data/";
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
		for (let name of fileNames) {
			let lines: string[] = fs.readFileSync(this.dataFolder + name).toString().split("\n");

			// Length of results should not include
			// 1. First line "courses" / "rooms"
			// 2. Empty line after final result \n character
			if (lines[0].split(".txt")[0] === "courses") {
				let courseSet: InsightDataset = {
					id: name.split(".txt")[0],
					kind: InsightDatasetKind.Courses,
					numRows: lines.length - 2
				};
				this.datasetStorage.push(courseSet);
			} else if (lines[0].split(".txt")[0] === "rooms") {
				let roomSet = {
					id: name.split(".txt")[0],
					kind: InsightDatasetKind.Rooms,
					numRows: lines.length - 2
				};
				this.datasetStorage.push(roomSet);
			}
		}
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		if (!this.baseValidateDataset(id)) {
			return Promise.reject(new InsightError("Dataset ID or content invalid"));
		}

		if (this.hasDataset(id)) {
			return Promise.reject(new InsightError("Requested dataset ID already exists in InsightUBC"));
		}

		let currSets: string[] = [];
		let rows: number = 0;
		// Grab the dataset ids that are already in the database
		for (let dataset of this.datasetStorage) {
			currSets.push(dataset.id);
		}

		// Read in the .ZIP file
		let zip = new JSZip();
		return zip.loadAsync(content, {base64: true}).then((contentZip) => {
			return this.findRows(contentZip, id);
		}).then((entryArray) => {
			let fsOp: FSOperator = new FSOperator();
			rows = fsOp.createDatasetOnDisk(entryArray, kind, this.dataFolder, id);
			currSets.push(id);
			// Create an InsightDataset object to track high-level information of the dataset being added
			let newDataset: InsightDataset = {
				id: id, kind: kind, numRows: rows
			};
			this.datasetStorage.push(newDataset);
			return Promise.resolve(currSets);
		}).catch((error) => {
			return Promise.reject(new InsightError(error));
		});
	}

	public removeDataset(id: string): Promise<string> {
		if (!this.baseValidateDataset(id)) {
			return Promise.reject(new InsightError("Invalid Dataset ID search term"));
		}

		if (!this.hasDataset(id)) {
			return Promise.reject(new NotFoundError("Dataset ID does not exist in current DB state"));
		}

		// Delete from InsightFacade object storage
		for (let index = 0; index < this.datasetStorage.length; index++) {
			if (this.datasetStorage[index].id === id) {
				this.datasetStorage.splice(index, 1);
			}
		}

		// Delete from disk
		fs.removeSync(this.dataFolder + id + ".txt");

		return Promise.resolve(id);
	}

	public performQuery(query: any): Promise<any[]> {
		// Reset the cache, remove results from previous query
		this.datasetEntries = [];
		try {
			// let obj = JSON.parse(query);
			let obj = query;
			let datasetToSearch: string = this.getDatasetToSearch(obj);

			let existingSets: string[] = [];
			for (let dataset of this.datasetStorage) {
				existingSets.push(dataset.id);
			}
			if (!existingSets.includes(datasetToSearch)) {
				throw new InsightError("Query column contains reference to non-existing dataset");
			}
			// At time of querying, then load relevant dataset
			let data: string[] = fs.readFileSync(this.dataFolder + datasetToSearch + ".txt").toString().split("\n");
			let setKind: string = data[0];
			let qOperator = new QueryOperator();
			qOperator.validateQuery(obj, setKind, existingSets);

			this.fillCache(data, setKind);

			// TODO: Evaluate query for semantics and reduce datasetEntries
			for (let entry of this.datasetEntries) {
				if (!qOperator.isWithinFilter(entry, obj.WHERE)) {
					this.datasetEntries.splice(this.datasetEntries.indexOf(entry), 1);
				}
			}

			if (this.datasetEntries.length > 5000) {
				return Promise.reject(new ResultTooLargeError("Query returned " + this.datasetEntries.length +
					" results"));
			}

			// TODO: Order the results and present as string[]
			this.orderResults(obj.OPTIONS.ORDER);
			let queryResults: string[] = this.craftResults(obj.OPTIONS.COLUMNS);
			return Promise.resolve(queryResults);
		} catch (error: any) {
			if (error instanceof SyntaxError) {
				return Promise.reject(new InsightError("Query is improperly formatted; invalid JSON"));
			}
			return Promise.reject(new InsightError(error));
		}
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.resolve(this.datasetStorage);
	}


	private baseValidateDataset(id: string): boolean {
		// Validate ID string using basic format scheme
		if (!id.match(/^[^_]+$/) || id.match(/\s+/)) {
			return false;
		}

		return true;
	}

	private findRows(contentZip: JSZip, id: string): Promise<DatasetEntry[]> {
		let dsZip = new DatasetZipReader();
		let totalRows: number = 0;
		let sections: number = 0;
		let rooms: number = 0;
		let retArray: DatasetEntry[] = [];
		return dsZip.getValidRows("courses", contentZip, id).then((array) => {
			totalRows += array.length;
			sections = array.length;
			if (sections !== 0) {
				retArray = array;
			}
			retArray = array;
		}).then(() => {
			dsZip.getValidRows("rooms", contentZip, id).then((array) => {
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

	private hasDataset(id: string): boolean {
		let existingSets: string[] = [];
		for (let dataset of this.datasetStorage) {
			existingSets.push(dataset.id);
		}
		return existingSets.includes(id);
	}

	private getDatasetToSearch(obj: any): string {
		const setToQuery: string[] = obj.OPTIONS.COLUMNS[0].split("_");
		// Need to check, or else we might get less than the full ID returned
		if (setToQuery.length !== 2) {
			throw new InsightError("Invalid query key in COLUMNS");
		}
		return setToQuery[0];
	}

	private fillCache(data: string[], kind: string) {
		// Remove first line "courses" / "rooms" and last empty newline
		data.splice(0, 1);
		data.splice(data.length - 1, 1);
		for (let d of data) {
			let r = JSON.parse(d);
			if (kind === "courses") {
				this.datasetEntries.push(new CourseSection(r.courses_dept, r.courses_id, r.courses_avg,
					r.courses_instructor, r.courses_title, r.courses_pass, r.courses_fail, r.courses_audit,
					r.courses_uuid, r.courses_year));
			} else if (kind === "rooms") {
				// TODO: More Room attributes? Add here
				this.datasetEntries.push(new Room(r.room_roomNumber, r.room_building, r.room_capacity));
			} else {
				throw new InsightError("Stored dataset kind unspecified; " +
					"is the first line of the file 'courses' or 'rooms'?");
			}
		}
	}

	// TODO: Implement ordering and string crafting
	private orderResults(obj: any) {
		return;
	}

	private craftResults(obj: any): string[] {
		return [];
	}
}
