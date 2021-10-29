import JSZip from "jszip";
import { InsightError } from "../controller/IInsightFacade";
import CourseSection from "../storageType/CourseSection";
import { DatasetEntry } from "../storageType/DatasetEntry";
import Room from "../storageType/Room";

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
		contentZip.folder(folder)?.forEach(function (relativePath, file) {
			let newPromise = file.async("string");
			promises.push(newPromise);
		});

		return Promise.all(promises).then((files) => {
			for (let f of files) {
				try {
					const obj = JSON.parse(f);
					if (obj.result === undefined) {
						// Skip this file, either empty or no entries correctly listed
						continue;
					}
					let singleFileResult: DatasetEntry[] = this.addValidRows(folder, obj);
					for (let result of singleFileResult) {
						totalResult.push(result);
					}
				} catch (error: any) {
					// Perpetuate if unrecoverable; continue if JSON SyntaxError
					if (error instanceof InsightError) {
						throw error;
					}
				}
			}

			if (totalResult.length === 0) {
				if (folder === "courses") {
					throw new InsightError("No valid course sections found");
				} else if (folder === "rooms") {
					throw new InsightError("No valid room info found");
				}
			}
			return Promise.resolve(totalResult);
		});
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
			}
		}
		return result;
	}
}
