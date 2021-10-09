import * as fs from "fs-extra";
import JSZip from "jszip";
import CourseSection from "../storageType/CourseSection";
import { DatasetEntry } from "../storageType/DatasetEntry";
import Room from "../storageType/Room";

export default class FSOperator {
	/**
	 * @param folder the name of the folder to extract JSON files from
	 * @param contentZip a JSZip object populated with the contents of a .ZIP file
	 * @param id the intended ID string for this dataset to be added
	 * @returns an array containing the CourseSections or Rooms with extracted field values filled
	 * We expect a dataset to contain one of the following folder names: ["courses", "rooms"]
	 */
	public getValidRows(folder: string, contentZip: JSZip, id: string): Promise<DatasetEntry[]> {
		let result: DatasetEntry[] = [];
		let promises: Array<Promise<string>> = [];
		contentZip.folder(folder)?.forEach(function (relativePath, file) {
			let newPromise = file.async("string");
			promises.push(newPromise);
		});

		return Promise.all(promises).then(function (files) {
			for (let f of files) {
				const obj = JSON.parse(f);
				if (obj.result === undefined) {
					throw new Error("Missing 'result' keyword in file content.");
				}

				if (folder === "courses") {
					for (let r of obj.result) {
						if (r.Subject === undefined || r.Course === undefined || r.Avg === undefined ||
							r.Professor === undefined || r.Title === undefined || r.Pass === undefined ||
							r.Fail === undefined || r.Audit === undefined || r.id === undefined ||
							r.Year === undefined) {
							continue;
						}
						// Start crafting the section representation in DB system
						result.push(new CourseSection(r.Subject, r.Course, r.Avg, r.Professor, r.Title,
							r.Pass, r.Fail, r.Audit, r.id, r.Year));
					}

					if (result.length === 0) {
						throw new Error("No valid course sections found");
					}
				} else if (folder === "rooms") {
					// TODO: Behaviour not yet defined; placeholder code
					for (let r of obj.result) {
						if (r.Room === undefined || r.Building === undefined || r.Capacity === undefined) {
							continue;
						}
						result.push(new Room(r.Room, r.Building, r.Capacity));
					}

					if (result.length === 0) {
						throw new Error("No valid room info found");
					}
				}
			}
			return Promise.resolve(result);
		});
	}
}
