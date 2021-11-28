import {InsightError} from "../controller/IInsightFacade";

export default class KeyValidator {

	public checkKey(id: string, fields: string[], obj: any, comp: string, key: string) {
		switch(key) {
			// String Course fields
			case id + "_dept":
			case id + "_id":
			case id + "_instructor":
			case id + "_title":
			case id + "_uuid":
			// String Room fields
			case id + "_fullname":
			case id + "_shortname":
			case id + "_number":
			case id + "_name":
			case id + "_address":
			case id + "_type":
			case id + "_furniture":
			case id + "_href":
				this.checkStringKey(comp, key, id, fields, obj);
				break;
			// Number Course fields
			case id + "_avg":
			case id + "_pass":
			case id + "_fail":
			case id + "_audit":
			case id + "_year":
			// Number Room fields
			case id + "_lat":
			case id + "_lon":
			case id + "_seats":
				this.checkNumberKey(comp, key, id, fields, obj);
				break;
			default:
				throw new InsightError("Comparison key does not match any known supported query keys; " +
					"check dataset ID or attribute in the WHERE clause");
		}
	}

	private checkStringKey(comp: string, key: string, id: string, fields: string[], obj: any) {
		if (comp === "GT" || comp === "LT" || comp === "EQ") {
			throw new InsightError("Comparison of type GT, LT, EQ cannot be done on string query key");
		}
		if (key.split("_").length !== 2 || key.split("_")[0] !== id ||
			!fields.includes(key.split("_")[1])) {
			throw new InsightError("WHERE clause contains invalid string comparison key");
		}
		if (!(typeof Object.values(obj)[0] === "string")) {
			throw new InsightError("WHERE clause contains string comparison but value is not string");
		}
		let strVal: string = "";
		strVal = (Object.values(obj)[0] as string);
		if (strVal.indexOf("*", 1) > 0 && strVal.indexOf("*", 1) < strVal.length - 1) {
			throw new InsightError("WHERE clause contains string comparison with non-edge position wildcard");
		}
	}

	private checkNumberKey(comp: string, key: string, id: string, fields: string[], obj: any) {
		if (comp === "IS") {
			throw new InsightError("Comparison of type IS cannot be done on numerical query key");
		}
		if (key.split("_").length !== 2 || key.split("_")[0] !== id ||
			!fields.includes(key.split("_")[1])) {
			throw new InsightError("WHERE clause contains invalid numerical comparison key");
		}
		if (!(typeof Object.values(obj)[0] === "number")) {
			throw new InsightError("WHERE clause contains numerical comparison but value is not numerical");
		}
	}
}
