import JSZip from "jszip";
import {InsightError} from "../controller/IInsightFacade";
import CourseSection from "../storageType/CourseSection";
import {DatasetEntry} from "../storageType/DatasetEntry";
import Room from "../storageType/Room";
import * as p5 from "parse5";
import {ChildNode, Document} from "parse5";

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
				totalResult = this.handleCourseFiles(files);
				return Promise.resolve(totalResult);
			});
		} else if (folder === "rooms") {
			let index: JSZip.JSZipObject | null = contentZip.file(folder + "/index.htm");
			if (index === null) {
				throw new InsightError("Zip file is missing index.htm in root directory under 'rooms'");
			}
			return index.async("string").then((indexContent) => {
				return p5.parse(indexContent);
			}).then((document) => {
				let indexInfo = this.findIndexBuildingInfo(document);
				return this.handleRoomFiles(folder, contentZip, indexInfo);
			}).then((entries: DatasetEntry[]) => {
				return Promise.resolve(entries);
			});
		} else {
			throw new InsightError("Unreachable: folder to check for should be either 'courses' or 'rooms'");
		}
	}

	private findIndexBuildingInfo(document: any): string[][] {
		let filePaths: string[] = [];
		let buildingNames: string[] = [];
		let buildingCodes: string[] = [];
		let buildingAddresses: string[] = [];
		this.extractBuildingInfoInto(filePaths, buildingNames, buildingCodes, buildingAddresses, document);
		return [filePaths, buildingNames, buildingCodes, buildingAddresses];
	}

	private extractBuildingInfoInto(filePaths: string[], buildingNames: string[], buildingCodes: string[],
		buildingAddresses: string[], node: any) {
		// Setup base case ; sanity check that a link is only pushed if it is intending to go somewhere within ZIP
		if (node.nodeName === "a") {
			this.extractFromLink(node, filePaths, buildingNames);
		} else if (node.nodeName === "td") {
			if (node.attrs) {
				for (let attr of node.attrs) {
					if (attr.name === "class") {
						if (attr.value === "views-field views-field-field-building-code") {
							for (let n of node.childNodes) {
								if (n.nodeName === "#text") {
									// No duplicate codes
									if (!buildingCodes.includes(n.value.replace("\n", "").trim())) {
										buildingCodes.push(n.value.replace("\n", "").trim());
									}
								}
							}
						}
						if (attr.value === "views-field views-field-field-building-address") {
							for (let n of node.childNodes) {
								// Allow for locations to have the same address when not distinguished by units or other
								if (n.nodeName === "#text") {
									buildingAddresses.push(n.value.replace("\n", "").trim());
								}
							}
						}
						if (attr.value === "views-field views-field-title") {
							for (let childNode of node.childNodes) {
								this.extractBuildingInfoInto(filePaths, buildingNames, buildingCodes,
									buildingAddresses, childNode);
							}
						}
					}
				}
			}
		} else {
			if (node.childNodes) {
				for (let childNode of node.childNodes) {
					this.extractBuildingInfoInto(filePaths, buildingNames, buildingCodes, buildingAddresses, childNode);
				}
			}
		}
	}

	private extractFromLink(node: any, filePaths: string[], buildingNames: string[]) {
		if (node.attrs && node.attrs.length > 1) {
			for (let attr of node.attrs) {
				if (attr.name === "href") {
					if (attr.value.substr(0, 2) === "./") {
						if (!filePaths.includes(attr.value)) {
							filePaths.push(attr.value);
						}
					}
				}
				if (attr.name === "title") {
					if (attr.value === "Building Details and Map") {
						for (let n of node.childNodes) {
							if (n.nodeName === "#text") {
								// No duplicate names
								if (!buildingNames.includes(n.value)) {
									buildingNames.push(n.value);
								}
							}
						}
					}
				}
			}
		}
	}

	private handleRoomFiles(folder: string, contentZip: JSZip, indexInfo: string[][]): Promise<DatasetEntry[]> {
		let promises: Array<Promise<string>> = [];
		for (let file of indexInfo[0]) {
			// <a href = "./campus/directories/ ... " ; remove prefix ./
			let filePath: string = file.split("./")[1];
			const currFile: JSZip.JSZipObject | null = contentZip.file(folder + "/" + filePath);
			// If file that is in the link non-existent in dataset, skip
			if (currFile === null) {
				continue;
			}
			promises.push(currFile.async("string"));
		}

		return Promise.all(promises).then((filesContent) => {
			// indexInfo has fullname, shortname, address
			// filesContent has number, seats, type, furniture
			// lat, lon from http request
			// href from specific file <a href="https://students.ubc.ca/...
			let retEntries: DatasetEntry[] = [];

			// TODO: extract number, seats, type, furniture from a linked file
			let roomDets: Array<[string, number, string, string]>;
			for (let f of filesContent) {
				// Parse, gives number, seats, type, furniture
				// TODO: make room entries
				let doc: Document = p5.parse(f);
				retEntries.concat(this.findRoomRows(doc, null));
			}
			let index: number = 0;
			// indexInfo[0] is filePaths, indexInfo[1] is building names, indexInfo[2] is building codes, indexInfo[3] is addresses
			// retEntries.push(new Room(indexInfo[1][index], indexInfo[2][index], number, indexInfo[3][index]));
			return Promise.resolve(retEntries);
		});
	}

	private findRoomRows(document: Document, childNode: ChildNode | null): DatasetEntry[] {
		let obj: any = {};
		let buildingAddress: string = "6245%20Agronomy%20Road%20V6T%201Z4";
		buildingAddress.replace(" ", "%20");

		// Credits to https://nodejs.org/en/knowledge/HTTP/clients/how-to-create-a-HTTP-request/
		const options = {
			host: "http://cs310.students.cs.ubc.ca",
			path: "/api/v1/project_team115/" + buildingAddress,
			port: 11316,
			method: "GET"
		};

		let callback = function (response: any) {
			response.on("end", (data: any) => {
				if (response.statusCode !== 200) {
					return;
				}
				let geoResponse = JSON.parse(data);
				obj.lat = geoResponse.lat;
				obj.lon = geoResponse.lon;
			});
		};

		return http.request(options, callback).then();

		let rows: DatasetEntry[] = [];
		// TODO: find the table in there

		return rows;
	}

	private handleCourseFiles(files: string[]) {
		let courses: DatasetEntry[] = [];
		for (let f of files) {
			try {
				const obj = JSON.parse(f);
				if (obj.result === undefined) {
					// Skip this file, either empty or no entries correctly listed
					continue;
				}
				let singleFileResult: DatasetEntry[] = this.addValidCourses(obj);
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

	private addValidCourses(obj: any): DatasetEntry[] {
		let result: DatasetEntry[] = [];
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
		return result;
	}
}
