import JSZip from "jszip";
import {InsightError} from "../controller/IInsightFacade";
import CourseSection from "../storageType/CourseSection";
import {DatasetEntry} from "../storageType/DatasetEntry";
import Room from "../storageType/Room";
import * as p5 from "parse5";
import {Document} from "parse5";

const http = require("http");

export default class DatasetZipReader {
	/**
	 * @param folder the name of the folder to extract JSON files from
	 * @param contentZip a JSZip object populated with the contents of a .ZIP file
	 * @param id the intended ID string for this dataset to be added
	 * @returns an array containing the CourseSections or Rooms with extracted field values filled
	 * We expect a dataset to contain one of the following folder names: ["courses", "rooms"]
	 */
	public getValidRows(folder: string, contentZip: JSZip, id: string): Promise<DatasetEntry[]> {
		let totalResult: DatasetEntry[] = [];
		let promises: Array<Promise<string>> = [];

		if (folder === "courses") {
			contentZip.folder(folder)?.forEach(function (relativePath, file) {
				let newPromise = file.async("string");
				promises.push(newPromise);
			});

			return Promise.all(promises).then((files) => {
				totalResult = this.handleCourseFiles(folder, files);
				return Promise.resolve(totalResult);
			});
		} else if (folder === "rooms") {
			let index: JSZip.JSZipObject | null = contentZip.file(folder + "/index.htm");
			if (index === null) {
				throw new InsightError("Zip file is missing index.htm in root directory under 'rooms'");
			}
			index.async("string").then((indexContent) => {
				return p5.parse(indexContent);
			}).then((document) => {
				// TODO: Find <a href>s for links to other files in ZIP
				let filesToCheck: string[] = this.findRoomBuildingFiles(document);
				return this.handleRoomFiles(folder, contentZip, filesToCheck);
			}).then((entries) => {
				// TODO
			});

			return Promise.resolve(totalResult);
		} else {
			throw new InsightError("Unreachable: folder to check for should be either 'courses' or 'rooms'");
		}
	}

	private findRoomBuildingFiles(document: Document): string[] {
		// TODO: extract list of href from "a" elements in corresponding table
		let filePaths: string[] = [];
		// Base case: should occur when within an "a" tag
		let currElem = document["childNodes"];
		// Document -> html -> body -> div class="view-content" -> table class -> tbody
		for (let c of document.childNodes) {
			if (c.nodeName === "html") {
				//
			}
		}
		return filePaths;
	}

	private handleRoomFiles(folder: string, contentZip: JSZip, files: string[]): Promise<DatasetEntry[]> {
		let promises: Array<Promise<string>> = [];
		for (let f of files) {
			// <a href = "./campus/directories/ ... " ; remove prefix ./
			let filePath: string = f.split("./")[1];
			const currFile: JSZip.JSZipObject | null = contentZip.file(folder + "/" + filePath);
			// If file that is in the link non-existent in dataset, skip
			if (currFile === null) {
				continue;
			}
			promises.push(currFile.async("string"));
		}

		return Promise.all(promises).then((filesContent) => {
			let results: DatasetEntry[] = [];
			for (let fc of filesContent) {
				let doc: Document = p5.parse(fc);
				results = results.concat(this.findRoomRows(doc));
			}
			return Promise.resolve(results);
		});
	}

	private findRoomRows(document: Document): DatasetEntry[] {
		let rows: DatasetEntry[] = [];
		// TODO: find the table in there
		let buildingAddress: string = "";
		let httpAddress: string = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team115/" + buildingAddress;
		// TODO: HTTP GET REQUEST
		const request = http.get(httpAddress);
		return rows;
	}

	private handleCourseFiles(folder: string, files: string[]) {
		let courses: DatasetEntry[] = [];
		for (let f of files) {
			try {
				const obj = JSON.parse(f);
				if (obj.result === undefined) {
					// Skip this file, either empty or no entries correctly listed
					continue;
				}
				let singleFileResult: DatasetEntry[] = this.addValidRows(folder, obj);
				for (let result of singleFileResult) {
					courses.push(result);
				}
			} catch (error: any) {
				// Perpetuate if unrecoverable; continue if JSON SyntaxError
				if (error instanceof InsightError) {
					throw error;
				}
			}
		}
		return courses;
	}

	private addValidRows(folder: string, obj: any): DatasetEntry[] {
		let result: DatasetEntry[] = [];
		if (folder === "courses") {
			for (let r of obj.result) {
				if (r.Subject === undefined || r.Course === undefined || r.Avg === undefined ||
					r.Professor === undefined || r.Title === undefined || r.Pass === undefined ||
					r.Fail === undefined || r.Audit === undefined || r.id === undefined ||
					r.Year === undefined) {
					continue;
				}

				if (r.Section === "overall") {
					r.Year = 1900;
				}
				result.push(new CourseSection(r.Subject, r.Course, r.Avg, r.Professor, r.Title,
					r.Pass, r.Fail, r.Audit, r.id, r.Year));
			}
		} else if (folder === "rooms") {
			// TODO: Behaviour not yet defined; placeholder code
			for (let r of obj.result) {
				if (r.RoomNumber === undefined || r.Building === undefined || r.Capacity === undefined) {
					continue;
				}
				result.push(new Room(r.fullname, r.shortname, r.number, r.address, r.lat, r.lon, r.seats, r.type,
					r.furniture, r.href));
			}
		}
		return result;
	}
}
