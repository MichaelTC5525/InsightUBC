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
import QueryValidator from "../helper/QueryValidator";
import QueryEvaluator from "../helper/QueryEvaluator";
import ResultHandler from "../helper/ResultHandler";
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
			if (lines[0] === "courses") {
				let courseSet: InsightDataset = {
					id: name.split(".txt")[0],
					kind: InsightDatasetKind.Courses,
					numRows: lines.length - 2
				};
				this.datasetStorage.push(courseSet);
			} else if (lines[0] === "rooms") {
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
			return this.findRows(contentZip, id, kind);
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
			let obj = query;
			let datasetToSearch: string = this.getDatasetToSearch(obj);
			if (!this.hasDataset(datasetToSearch)) {
				throw new InsightError("Requested dataset in COLUMNS does not exist in DB");
			}
			let data: string[] = fs.readFileSync(this.dataFolder + datasetToSearch + ".txt").toString().split("\n");
			let setKind: string = data[0];
			let existingSets: string[] = [];
			for (let d of this.datasetStorage) {
				existingSets.push(d.id);
			}
			let qValidator = new QueryValidator();
			qValidator.validateQuery(datasetToSearch, obj, setKind, existingSets);
			let qEvaluator = new QueryEvaluator();
			data = qEvaluator.filterResults(data, obj.WHERE);
			this.updateDatasetEntriesCache(data, setKind);

			let rh: ResultHandler = new ResultHandler();
			if (obj.TRANSFORMATIONS === undefined) {
				if (this.datasetEntries.length > 5000) {
					return Promise.reject(new ResultTooLargeError("Query returned " + this.datasetEntries.length +
						" results"));
				}
				let queryResults: any[] = rh.craftResults(datasetToSearch, obj.OPTIONS.COLUMNS, this.datasetEntries);
				let completedResults = rh.orderResults(obj.OPTIONS.ORDER, queryResults);
				return Promise.resolve(completedResults);
			} else {
				for (let i = 0; i < data.length; i++) {
					data[i] = JSON.parse(data[i]);
				}
				let groupedResults: any[][] = rh.groupResults(obj.TRANSFORMATIONS.GROUP, data);
				let aggregatedResults: any[] = rh.aggregateResults(obj.OPTIONS.COLUMNS,
					obj.TRANSFORMATIONS.APPLY, groupedResults);
				let completedResults = rh.orderResults(obj.OPTIONS.ORDER, aggregatedResults);
				if (completedResults.length > 5000) {
					return Promise.reject(new ResultTooLargeError("Query with transformations returned " +
						completedResults.length + " groups"));
				}
				return Promise.resolve(completedResults);
			}
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
		return !(!id.match(/^[^_]+$/) || id.match(/\s+/));
	}

	private findRows(contentZip: JSZip, id: string, kind: string): Promise<DatasetEntry[]> {
		let dsZip = new DatasetZipReader();
		let totalRows: number;

		if (kind === InsightDatasetKind.Courses) {
			return dsZip.getValidRows("courses", contentZip, id).then((array) => {
				totalRows = array.length;
				if (totalRows === 0) {
					throw new InsightError("Zip folder is empty or does not contain 'courses' directory.");
				}
				return array;
			});
		} else if (kind === InsightDatasetKind.Rooms) {
			return dsZip.getValidRows("rooms", contentZip, id).then((array) => {
				totalRows = array.length;
				if (totalRows === 0) {
					throw new InsightError("Zip folder is empty or does not contain 'rooms' directory.");
				}
				return array;
			});
		} else {
			throw new InsightError("Unreachable: Kind must be 'courses' or 'rooms'");
		}
	}

	private hasDataset(id: string): boolean {
		let existingSets: string[] = [];
		for (let dataset of this.datasetStorage) {
			existingSets.push(dataset.id);
		}
		return existingSets.includes(id);
	}

	private getDatasetToSearch(obj: any): string {
		let setToQuery: string[] = [];
		for (let c of obj.OPTIONS.COLUMNS) {
			setToQuery = c.split("_");
			if (setToQuery.length === 2) {
				if (setToQuery[0] === "") {
					throw new InsightError("Pre-validation: A query COLUMNS key is missing a dataset ID");
				}
				return setToQuery[0];
			}
		}
		// If columns didn't include a 'id_attr', then a TRANSFORMATIONS.GROUP must be present, with this form
		try {
			setToQuery = obj.TRANSFORMATIONS.GROUP[0].split("_");
		} catch (error: any) {
			throw new InsightError(error);
		}
		return setToQuery[0];
	}

	private updateDatasetEntriesCache(from: string[], kind: string) {
		for (let entry of from) {
			try {
				let r = JSON.parse(entry);
				let pushVals: any[] = Object.values(r);
				if (kind === "courses") {
					this.datasetEntries.push(new CourseSection(pushVals[0], pushVals[1], pushVals[2], pushVals[3],
						pushVals[4], pushVals[5], pushVals[6], pushVals[7], pushVals[8], pushVals[9]));
				} else if (kind === "rooms") {
					this.datasetEntries.push(new Room(pushVals[0], pushVals[1], pushVals[2], pushVals[3], pushVals[4],
						pushVals[5], pushVals[6], pushVals[7], pushVals[8], pushVals[9]));
				} else {
					throw new InsightError("Filtered results list are of unidentifiable dataset type");
				}
			} catch (error: any) {
				throw new InsightError(error);
			}
		}
	}
}
