import * as fs from "fs-extra";
import JSZip from "jszip";
import CourseSection from "../storageType/CourseSection";

export default class FSOperator {

	// TODO: Other return value option will likely be a custom type for Rooms
	/**
	 * @param folder the name of the folder to extract JSON files from
	 * @param contentZip a JSZip object populated with the contents of a .ZIP file
	 * @param id the intended ID string for this dataset to be added
	 * @returns an array containing the CourseSections or Rooms with extracted field values filled
	 * We expect a dataset to contain one of the following folder names: ["courses", "rooms"]
	 */
	public getValidRows(folder: string, contentZip: JSZip, id: string): CourseSection[] | string[] {
		let result: CourseSection[] = [];

		contentZip.folder(folder)?.forEach(function (relativePath, file) {
			contentZip.file(file.name)?.async("string")
				.then(function (data) {
					const obj = JSON.parse(data);
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
					} else if (folder === "rooms") {
						// TODO: Behaviour not yet defined; placeholder code
						for (let r of obj.result) {
							if (r.Room === undefined) {
								continue;
							}
							// result.push(new Room(roomNumber, roomLocation, etc.));
						}
					}
				});
			if (result.length === 0) {
				throw new Error("No valid information from JSON files found");
			}
		});
		return result;
	}


	public writeFilesWithData(folder: string, contentZip: JSZip): void {
		// Read each of the files within the courses directory, if it exists
		contentZip.folder(folder)?.forEach(function (relativePath, file) {
			contentZip.file(file.name)?.async("string")
				.then(function (data) {
					fs.writeFile("./data/${id}/" + file.name, data);
				});
		});
	}
}
