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
		let fileContent: string = this.makeFileContents(array, kind);
		fs.writeFileSync(folder + id + ".txt", fileContent);
		// Number of entries should not include
		// 1. first line "courses" / "rooms" as well as
		// 2. the extra newline after the final result
		return fileContent.split("\n").length - 2;
	}

	private makeFileContents(content: DatasetEntry[], kind: InsightDatasetKind): string {
		let entries: string = "";
		if (kind === InsightDatasetKind.Courses) {
			entries += "courses\n";
			for (let c of content) {
				let line: string = "{ \"courses_dept\": \"" + (c as CourseSection).getField("dept") + "\", " +
					"\"courses_id\": \"" + (c as CourseSection).getField("id") + "\", " +
					"\"courses_avg\": " + (c as CourseSection).getField("avg") + ", " +
					"\"courses_instr\": \"" + (c as CourseSection).getField("instr") + "\", " +
					"\"courses_title\": \"" + (c as CourseSection).getField("title") + "\", " +
					"\"courses_pass\": " + (c as CourseSection).getField("pass") + ", " +
					"\"courses_fail\": " + (c as CourseSection).getField("fail") + ", " +
					"\"courses_audit\": " + (c as CourseSection).getField("audit") + ", " +
					"\"courses_uuid\": \"" + (c as CourseSection).getField("uuid") + "\", " +
					"\"courses_year\": " + (c as CourseSection).getField("year") + " }";
				entries += (line + "\n");
			}
		} else if (kind === InsightDatasetKind.Rooms) {
			entries += "rooms\n";
			for (let c of content) {
				// TODO: Room result line may have more attributes
				let line: string = "{ \"rooms_roomNumber\": " + (c as Room).getField("roomNumber") + ", " +
					"\"rooms_building\": \"" + (c as Room).getField("building") + "\", " +
					"\"rooms_capacity\": " + (c as Room).getField("capacity") + " }";
				entries += (line + "\n");
			}
		} else {
			throw new InsightError("Invalid dataset kind requested");
		}
		return entries;
	}
}
