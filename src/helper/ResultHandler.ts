import {DatasetEntry} from "../storageType/DatasetEntry";

export default class ResultHandler {
	public orderResults(obj: any | string, entries: any[]): any[] {
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

	public groupResults(groupAttrs: string[], entries: any[]): any[][] {
		let retGroups: any[][] = [];
		for (let entry of entries) {
			// Flag to know if this entry was put somewhere; if not, it needs a group of its own
			let wasPushed: number = 0;
			// Determine if all attributes of interest for this entry match those of an existing group
			for (let array of retGroups) {
				// Assume this array unless proven guilty
				let pushHere: number = 1;
				for (let attr of groupAttrs) {
					// Check each field that a group is created based on; if there are any difference, entry should be
					//  in a different group (array of retGroups)
					if (array[0][attr] !== entry[attr]) {
						pushHere = 0;
					}
				}
				if (pushHere) {
					wasPushed = 1;
					array.push(entry);
					break;
				}
			}
			// If no existing groups matched with the attributes of this entry, create a new group
			if (!wasPushed) {
				retGroups.push([entry]);
			}
		}
		return retGroups;
	}

	public aggregateResults(applyColumns: any[], groups: any[][]): any[] {
		// TODO
		let retVal: any[] = [];
		// g = any[] = [ {"courses_dept": "math", "courses_id": "541", ...},
		// 				 {"courses_dept": "math", "courses_id": "541", ...} ]
		// applyColumns = any[] = [ { "columnName": { "MAX": "courses_avg" }} ]
		for (let g of groups) {
			for (let applyColumn of applyColumns) {
				this.handleAggOp(g, applyColumn);
			}
		}
		return retVal;
	}

	private handleAggOp(g: any[], applyColumn: any) {
		// applyColumn = { "applyKey": { "MAX": "courses_avg" }}
		let applyKey: string = Object.keys(applyColumn)[0];
		// attrKey = "courses_avg"
		let attrKey: string = (Object.values(applyColumn[applyKey])[0] as string);
	}

	// switch(Object.values(applyColumn[applyKey])) {
	//
	// }
}
