import JSZip from "jszip";
import {InsightError} from "../controller/IInsightFacade";
import CourseSection from "../storageType/CourseSection";
import {DatasetEntry} from "../storageType/DatasetEntry";
import Room from "../storageType/Room";
import * as p5 from "parse5";
import {Document} from "parse5";
import RoomParser from "./RoomParser";
import HTTProcessor from "./HTTProcessor";

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
				return this.requestCoords(indexInfo);
			}).then((entryParts) => {
				return this.handleRoomFiles(folder, contentZip, entryParts[0], entryParts[1]);
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

		let rp: RoomParser = new RoomParser();
		rp.extractBuildingInfoInto(filePaths, buildingNames, buildingCodes, buildingAddresses, document);
		return [filePaths, buildingNames, buildingCodes, buildingAddresses];
	}

	private requestCoords(indexInfo: string[][]): Promise<[string[][], Array<[number, number]>]> {
		let coordsPromises: Array<Promise<[number | null, number | null]>> = [];

		for (let address of indexInfo[3]) {
			// Replace spaces for HTTP requests
			while (address.includes(" ")) {
				address = address.replace(" ", "%20");
			}

			let httpProcessor: HTTProcessor = new HTTProcessor();
			let newPromise: Promise<[number | null, number | null]> = httpProcessor.makeHTTPromise(address);
			coordsPromises.push(newPromise);

			// Revert to normal spaces for the DatasetEntry to be pushed
			while (address.includes("%20")) {
				address = address.replace("%20", " ");
			}
		}

		return Promise.all(coordsPromises).then((responses: any[]) => {
			return [indexInfo, responses];
		});
	}

	private handleRoomFiles(folder: string, contentZip: JSZip, indexInfo: string[][],
		geoCoords: Array<[number | null, number | null]>): Promise<DatasetEntry[]> {
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
			/**
			 * indexInfo has fullname, shortname, address
			 * filesContent has number, seats, type, furniture
			 * lat, lon from http request --> "geoCoords" parameter
			 * href from specific file <a href="https://students.ubc.ca/...
			 */
			let retEntries: DatasetEntry[] = [];

			for (let f = 0; f < filesContent.length; f++) {
				// Request coordinates first; if invalid, no need to save this building's rooms
				let doc: Document = p5.parse(filesContent[f]);
				/**
				 * roomDets is an Array of tuples
				 * - each tuple of roomDets includes:
				 * [0] = (rooms_number)
				 * [1] = (rooms_seats)
				 * [2] = (rooms_type)
				 * [3] = (rooms_furniture)
				 * [4] = (rooms_href)
				 */
				let roomDets: Array<[string, number, string, string, string]> = [];
				roomDets = this.extractRoomDetails(doc);

				if (geoCoords[f] === [null, null]) {
					continue;
				}
				// Add entries, where one iteration for the building iterates over multiple rooms
				// If building has no rooms, roomDets is empty, and will not push any new entries
				for (const room of roomDets) {
					retEntries.push(new Room(indexInfo[1][f], indexInfo[2][f], room[0],
						indexInfo[3][f], (geoCoords[f][0] as number), (geoCoords[f][1] as number),
						room[1], room[2], room[3], room[4]));
				}
			}
			return Promise.resolve(retEntries);
		});
	}

	private extractRoomDetails(document: any):
		Array<[string, number, string, string, string]> {
		let entries: Array<[string, number, string, string, string]> = [];

		let roomNums: string[] = [];
		let roomSeats: number[] = [];
		let roomTypes: string[] = [];
		let roomFurnitures: string[] = [];
		let roomHrefs: string[] = [];

		let rp: RoomParser = new RoomParser();
		rp.extractRoomsInto(roomNums, roomSeats, roomTypes, roomFurnitures, roomHrefs, document);

		for (let i = 0; i < roomNums.length; i++) {
			let entry: [string, number, string, string, string] =
				[roomNums[i], roomSeats[i], roomTypes[i], roomFurnitures[i], roomHrefs[i]];
			entries.push(entry);
		}

		return entries;
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
