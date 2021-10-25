import * as fs from "fs-extra";
import {DatasetEntry} from "../storageType/DatasetEntry";
import {InsightDatasetKind, InsightError} from "../controller/IInsightFacade";
import CourseSection from "../storageType/CourseSection";
import Room from "../storageType/Room";

export default class FSOperator {
	/**
	 * Helps InsightFacade to write a new file containing a new dataset's rows to the disk space provided at a directory
	 * @param array the entries found in the dataset
	 * @param kind the type of dataset to create a storage file for: one of "courses" or "rooms"
	 * @param folder the parent folder in which new dataset files are stored
	 * @param id the requested ID for this new dataset
	 *
	 * @return number the number of resulting entries written to the file, excluding the set kind and EOF newline
	 */
	public createDatasetOnDisk(array: DatasetEntry[], kind: InsightDatasetKind, folder: string, id: string): number {
		let fileContent: string = this.makeFileContents(array, kind, id);
		fs.writeFileSync(folder + id + ".txt", fileContent);
		// Number of entries should not include
		// 1. first line "courses" / "rooms" as well as
		// 2. the extra newline after the final result
		return fileContent.split("\n").length - 2;
	}

	private makeFileContents(content: DatasetEntry[], kind: InsightDatasetKind, id: string): string {
		let entries: string = "";
		if (kind === InsightDatasetKind.Courses) {
			entries += "courses\n";
			for (let c of content) {
				let line: string = "{ \"" + id + "_dept\": \"" + (c as CourseSection).getField("dept") + "\", " +
					"\"" + id + "_id\": \"" + (c as CourseSection).getField("id") + "\", " +
					"\"" + id + "_avg\": " + (c as CourseSection).getField("avg") + ", " +
					"\"" + id + "_instructor\": \"" + (c as CourseSection).getField("instr") + "\", " +
					"\"" + id + "_title\": \"" + (c as CourseSection).getField("title") + "\", " +
					"\"" + id + "_pass\": " + (c as CourseSection).getField("pass") + ", " +
					"\"" + id + "_fail\": " + (c as CourseSection).getField("fail") + ", " +
					"\"" + id + "_audit\": " + (c as CourseSection).getField("audit") + ", " +
					"\"" + id + "_uuid\": \"" + (c as CourseSection).getField("uuid") + "\", " +
					"\"" + id + "_year\": " + (c as CourseSection).getField("year") + " }";
				entries += (line + "\n");
			}
		} else if (kind === InsightDatasetKind.Rooms) {
			entries += "rooms\n";
			for (let c of content) {
				let line: string = "{ \"" + id + "_fullName\": " + (c as Room).getField("fullName") + ", " +
					"\"" + id + "_shortName\": \"" + (c as Room).getField("shortName") + "\", " +
					"\"" + id + "_number\": " + (c as Room).getField("number") + "\", " +
					"\"" + id + "_name\": " + (c as Room).getField("name") + "\", " +
					"\"" + id + "_address\": " + (c as Room).getField("address") + "\", " +
					"\"" + id + "_lat\": " + (c as Room).getField("lat") + ", " +
					"\"" + id + "_lon\": " + (c as Room).getField("lon") + ", " +
					"\"" + id + "_seats\": " + (c as Room).getField("seats") + ", " +
					"\"" + id + "_type\": " + (c as Room).getField("type") + "\", " +
					"\"" + id + "_furniture\": " + (c as Room).getField("furniture") + "\", " +
					"\"" + id + "_href\": " + (c as Room).getField("href")	+ " }";
				entries += (line + "\n");
			}
		} else {
			throw new InsightError("Invalid dataset kind requested");
		}
		return entries;
	}
}
