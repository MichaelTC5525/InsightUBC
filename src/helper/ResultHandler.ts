import {DatasetEntry} from "../storageType/DatasetEntry";

export default class ResultHandler {
	public orderResults(obj: any | string, kind: string, entries: any[]): any[] {
		if (obj === undefined) {
			return entries;
		}
		if (typeof obj === "string") {
			entries.sort(function compareFunc(entry1, entry2) {
				if (entry1[obj] < entry2[obj]) {
					return -1;
				} else if (entry1[obj] > entry2[obj]) {
					return 1;
				} else {
					return 0;
				}
			});
		} else {
			let compareRetVals: number[];
			if (obj.dir === "DOWN") {
				compareRetVals = [1, -1];
			} else {
				compareRetVals = [-1, 1];
			}

			entries.sort(function compareFunc(entry1, entry2) {
				return compareFuncHelp(0);

				function compareFuncHelp(index: number): number {
					if (entry1[obj.keys[index]] < entry2[obj.keys[index]]) {
						return compareRetVals[0];
					} else if (entry1[obj.keys[index]] > entry2[obj.keys[index]]) {
						return compareRetVals[1];
					} else {
						if (index === obj.keys.length - 1) {
							return 0;
						}
						return compareFuncHelp(index + 1);
					}
				}
			});
		}

		return entries;
	}

	public craftResults(id: string, columns: string[], entries: DatasetEntry[]): any[] {
		let retArray: any[] = [];
		for (let entry of entries) {
			retArray.push(this.createNextCourse(id, columns, entry));
		}
		for (let i = 0; i < retArray.length; i++) {
			retArray[i] = JSON.parse(retArray[i]);
		}
		return retArray;
	}

	private createNextCourse(id: string, columns: string[], entry: DatasetEntry): string {
		let resultLine: string = "";
		for (let c = 0; c < columns.length; c++) {
			if (c === 0) {
				resultLine += "{";
			}
			switch(columns[c]) {
				case id + "_dept":
					resultLine += ("\"" + id + "_dept\": \"") + entry.getField("dept") + "\"";
					break;
				case id + "_id":
					resultLine += ("\"" + id + "_id\": \"") + entry.getField("id") + "\"";
					break;
				case id + "_avg":
					resultLine += ("\"" + id + "_avg\": ") + entry.getField("avg");
					break;
				case id + "_title":
					resultLine += ("\"" + id + "_title\": \"") + entry.getField("title") + "\"";
					break;
				case id + "_instructor":
					resultLine += ("\"" + id + "_instructor\": \"") + entry.getField("instr") + "\"";
					break;
				case id + "_pass":
					resultLine += ("\"" + id + "_pass\": ") + entry.getField("pass");
					break;
				case id + "_fail":
					resultLine += ("\"" + id + "_fail\": ") + entry.getField("fail");
					break;
				case id + "_audit":
					resultLine += ("\"" + id + "_audit\": ") + entry.getField("audit");
					break;
				case id + "_uuid":
					resultLine += ("\"" + id + "_uuid\": \"") + entry.getField("uuid") + "\"";
					break;
				case id + "_year":
					resultLine += ("\"" + id + "_year\": ") + entry.getField("year");
					break;
			}

			if (c === columns.length - 1) {
				resultLine += "}";
			} else {
				resultLine += ", ";
			}
		}

		return resultLine;
	}
}
