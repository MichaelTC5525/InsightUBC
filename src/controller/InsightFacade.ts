import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";
import * as fs from 'fs-extra';
import 'jszip';
import JSZip from "jszip";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {

	datasetStorage: InsightDataset[];
	courseSections: Map<string, string>;

	/**
	 * On creating a new InsightFacade instance, we should read the ./data file system directory
	 * in order to ensure that we reload any existing datasets and course sections that were left from
	 * a previous instance of the class
	 */ 
	constructor() {
		console.trace("InsightFacadeImpl::init()");
		this.datasetStorage = [];
		this.courseSections = new Map<string, string>();
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {

		let currSets: string[] = [];

		// Grab the dataset ids that are already in the database
		for (var dataset of this.datasetStorage) {
			currSets.push(dataset.id);
		}

		// Validate ID string using basic format scheme
		if (!id.match(/^[^_]+$/)) {
			return Promise.reject(new InsightError("Invalid requested dataset ID"));
		}

		// Validate content string; Sanity check that string is base64
		// base64 regex pattern from StackOverflow https://stackoverflow.com/questions/8571501/how-to-check-whether-a-string-is-base64-encoded-or-not
		if (!content.match(/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/)) {
			return Promise.reject(new InsightError("Invalid dataset content"));
		}

		// Read in the .ZIP file
		let zip = new JSZip();
		zip.loadAsync(content, {base64: true})
			.then((zip) => {
				// Search through and parse the valid JSON files
				
			})
			.catch((error) => {
				// Remove the folder in case it was created asynchronously
				zip.remove("./data");
				return Promise.reject("Something went wrong loading the dataset. Ensure your .zip is in base64 string format");
			});

		// Create a data folder to use as the space on disk
		zip.folder("./data/" + id + "/")

		// Create an InsightDataset object to track high-level information of the dataset being added
		let newDataset: InsightDataset = {
			id: id,
			kind: kind,
			numRows: 0   // to be variable
		}
		currSets.push(id);
		this.datasetStorage.push(newDataset);
		return Promise.resolve(currSets);
	}

	public removeDataset(id: string): Promise<string> {
		return Promise.reject("Not implemented.");
	}

	public performQuery(query: any): Promise<any[]> {
		return Promise.reject("Not implemented.");
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.reject("Not implemented.");
	}
}
