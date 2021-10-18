import {InsightError} from "../controller/IInsightFacade";

export default class QueryValidator {
	public validateQuery(obj: any, kind: string, existingSets: string[]) {
		// TODO: max number of keys in WHERE clause is 3 (allows TRANSFORMATIONS)
		if (obj.WHERE === undefined || obj.OPTIONS.COLUMNS[0] === undefined || Object.keys(obj).length > 2) {
			throw new InsightError("Query does not contain required keys, or has excess keys");
		}

		let validQueryKeys: string[] = [];
		if (kind === "courses") {
			validQueryKeys = ["dept", "id", "avg", "instructor", "title", "pass", "fail", "audit", "uuid", "year"];
		} else if (kind === "rooms") {
			// TODO: More Room attributes? Add here
			validQueryKeys = ["roomNumber", "building", "capacity"];
		} else {
			throw new InsightError("Invalid dataset kind in validating query");
		}

		let id: string = this.validateOptions(validQueryKeys, obj.OPTIONS);
		if (!existingSets.includes(id)) {
			throw new InsightError("Invalid query key in COLUMNS");
		}

		this.validateWhereFilter(id, validQueryKeys, obj.WHERE);
	}

	private validateOptions(fields: string[], obj: any): string {
		let idToMatch: string = "";
		for (let c of obj.COLUMNS) {
			let keyPieces: string[] = c.split("_");
			if (keyPieces.length === 2) {
				if (keyPieces[0] === "" || !fields.includes(keyPieces[1])) {
					throw new InsightError("Invalid query key in COLUMNS");
				}

				if (idToMatch !== "") {
					if (keyPieces[0] !== idToMatch) {
						throw new InsightError("Invalid dataset ID found in COLUMNS");
					}
				}
			}
			if (idToMatch === "") {
				idToMatch = keyPieces[0];
			}
		}

		// TODO: Order can have another level of attributes
		if (obj.ORDER) {
			if (obj.ORDER instanceof Array) {
				throw new InsightError("Cannot sort data by more than one column");
			}
			let orderPieces: string[] = obj.ORDER.split("_");
			if (orderPieces[0] !== idToMatch || !fields.includes(orderPieces[1]) || orderPieces.length !== 2) {
				throw new InsightError("Invalid query key in ORDER");
			}

			if (!obj.COLUMNS.includes(obj.ORDER)) {
				throw new InsightError("Ordering column is missing from requested columns");
			}
		}

		return idToMatch;
	}

	private validateWhereFilter(id: string, fields: string[], obj: any) {
		if (Object.keys(obj).length === 0) {
			return;
		} else if (Object.keys(obj).length > 1) {
			throw new InsightError("WHERE clause should have exactly 1 key, has " + Object.keys(obj).length);
		}

		let comp = Object.keys(obj)[0];
		let compKey: string;
		switch(comp) {
			case "GT":
			case "LT":
			case "EQ":
			case "IS":
				compKey = Object.keys(obj[comp])[0];
				this.checkKey(id, fields, obj[comp], compKey);
				break;
			case "OR":
				if (Object.keys(obj.OR).length === 0) {
					throw new InsightError("Logic comparison wrapper array contains no filters");
				}
				for (let k = 0; k < Object.keys(obj.OR).length; k++) {
					this.validateWhereFilter(id, fields, obj.OR[k]);
				}
				break;
			case "AND":
				if (Object.keys(obj.AND).length === 0) {
					throw new InsightError("Logic comparison wrapper array contains no filters");
				}
				for (let m = 0; m < Object.keys(obj.AND).length; m++) {
					this.validateWhereFilter(id, fields, obj.AND[m]);
				}
				break;
			case "NOT":
				compKey = Object.keys(obj.NOT)[0];
				this.validateWhereFilter(id, fields, obj.NOT.valueOf());
				break;
			default:
				throw new InsightError("WHERE clause contains unsupported logic / comparison type");
		}
	}

	private checkKey(id: string, fields: string[], obj: any, key: string) {
		let strVal: string = "";
		switch(key) {
		// String Course fields
			case id + "_dept":
			case id + "_id":
			case id + "_instructor":
			case id + "_title":
			case id + "_uuid":
			// String Room fields
			case id + "_building":
				if (key.split("_").length !== 2 || key.split("_")[0] !== id ||
					!fields.includes(key.split("_")[1])) {
					throw new InsightError("WHERE clause contains invalid string comparison key");
				}
				if (!(typeof Object.values(obj)[0] === "string")) {
					throw new InsightError("WHERE clause contains string comparison but value is not string");
				}

				strVal = (Object.values(obj)[0] as string);
				if (strVal.indexOf("*", 1) > 0 && strVal.indexOf("*", 1) < strVal.length - 1) {
					throw new InsightError("WHERE clause contains string comparison with non-edge position wildcard");
				}
				break;
			// Number Course fields
			case id + "_avg":
			case id + "_pass":
			case id + "_fail":
			case id + "_audit":
			case id + "_year":
			// Number Room fields
			case id + "_roomNumber":
			case id + "_capacity":
				if (key.split("_").length !== 2 || key.split("_")[0] !== id ||
					!fields.includes(key.split("_")[1])) {
					throw new InsightError("WHERE clause contains invalid numerical comparison key");
				}
				if (!(typeof Object.values(obj)[0] === "number")) {
					throw new InsightError("WHERE clause contains numerical comparison but value is not numerical");
				}
				break;
			default:
				throw new InsightError("Comparison key does not match any known supported query keys; " +
											"check dataset ID or attribute in the WHERE clause");
		}
	}
}
