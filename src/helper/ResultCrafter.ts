import {DatasetEntry} from "../storageType/DatasetEntry";

export default class ResultCrafter {

	public craftResults(id: string, columns: string[], kind: string, entries: DatasetEntry[]): any[] {
		let retArray: any[] = [];
		if (kind === "courses") {
			for (let entry of entries) {
				retArray.push(this.createNextCourse(id, columns, entry));
			}
		} else if (kind === "rooms") {
			for (let entry of entries) {
				retArray.push(this.createNextRoom(id, columns, entry));
			}
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

	private createNextRoom(id: string, columns: string[], entry: DatasetEntry): string {
		let resultLine: string = "";
		for (let c = 0; c < columns.length; c++) {
			if (c === 0) {
				resultLine += "{";
			}
			switch(columns[c]) {
				case id + "_fullname":
					resultLine += ("\"" + id + "_fullname\": \"") + entry.getField("fullname") + "\"";
					break;
				case id + "_shortname":
					resultLine += ("\"" + id + "_shortname\": \"") + entry.getField("shortname") + "\"";
					break;
				case id + "_number":
					resultLine += ("\"" + id + "_number\": \"") + entry.getField("number") + "\"";
					break;
				case id + "_name":
					resultLine += ("\"" + id + "_name\": \"") + entry.getField("name") + "\"";
					break;
				case id + "_address":
					resultLine += ("\"" + id + "_address\": \"") + entry.getField("address") + "\"";
					break;
				case id + "_lat":
					resultLine += ("\"" + id + "_lat\": ") + entry.getField("lat");
					break;
				case id + "_lon":
					resultLine += ("\"" + id + "_lon\": ") + entry.getField("lon");
					break;
				case id + "_seats":
					resultLine += ("\"" + id + "_seats\": ") + entry.getField("seats");
					break;
				case id + "_type":
					resultLine += ("\"" + id + "_type\": \"") + entry.getField("type") + "\"";
					break;
				case id + "_furniture":
					resultLine += ("\"" + id + "_furniture\": \"") + entry.getField("furniture") + "\"";
					break;
				case id + "_href":
					resultLine += ("\"" + id + "_href\": \"") + entry.getField("href") + "\"";
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
