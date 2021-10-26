import {InsightError} from "../controller/IInsightFacade";

export default class QueryValidator {
	public validateQuery(obj: any, kind: string, existingSets: string[]) {
		if (obj.WHERE === undefined || obj.OPTIONS.COLUMNS[0] === undefined || Object.keys(obj).length > 3) {
			throw new InsightError("Query does not contain required keys, or has excess keys");
		}

		let validQueryKeys: string[] = [];
		if (kind === "courses") {
			validQueryKeys = ["dept", "id", "avg", "instructor", "title", "pass", "fail", "audit", "uuid", "year"];
		} else if (kind === "rooms") {
			validQueryKeys = ["fullName", "shortName", "number", "name", "address", "lat", "lon", "seats", "type",
				"furniture", "href"];
		} else {
			throw new InsightError("Invalid dataset kind in validating query");
		}

		let id: string = this.validateOptions(validQueryKeys, obj.OPTIONS);
		if (!existingSets.includes(id)) {
			throw new InsightError("Invalid query key in COLUMNS");
		}

		this.validateWhereFilter(id, validQueryKeys, obj.WHERE);

		if (obj.TRANSFORMATIONS !== undefined) {
			this.validateTransformations(obj.OPTIONS.COLUMNS, obj.TRANSFORMATIONS);
		}
	}

	private validateOptions(fields: string[], obj: any): string {
		let idToMatch: string = "";
		for (let c of obj.COLUMNS) {
			let keyPieces: string[] = c.split("_");
			// Only act on it if there was an underscore that split the string
			// Will not affect names that might represent aggregation columns
			if (keyPieces.length === 2) {
				if (keyPieces[0] === "") {
					throw new InsightError("Query COLUMNS contains a null string ID");
				}
				if (!fields.includes(keyPieces[1])) {
					throw new InsightError("Invalid query key in COLUMNS");
				}
				if (idToMatch !== "") {
					if (keyPieces[0] !== idToMatch) {
						throw new InsightError("Invalid dataset ID found in COLUMNS");
					}
				}
				// Initialize the ID we must match in any other query location with form "id_attr"
				if (idToMatch === "") {
					idToMatch = keyPieces[0];
				}
			} else if (keyPieces.length > 2) {
				throw new InsightError("Query key in COLUMNS contains multiple underscores");
			}
		}

		if (idToMatch === "") {
			throw new InsightError("Query COLUMNS must contain at least entry of the form 'id_attribute'");
		}
		this.validateOrder(idToMatch, fields, obj);

		return idToMatch;
	}

	private validateOrder(idToMatch: string, fields: string[], obj: any) {
		if (obj.ORDER) {
			if (obj.ORDER instanceof Array) {
				throw new InsightError("ORDER clause cannot be an array at top level");
			}
			if (typeof obj.ORDER === "string") {
				let orderPieces: string[] = obj.ORDER.split("_");
				if (orderPieces[0] !== idToMatch || !fields.includes(orderPieces[1]) || orderPieces.length !== 2) {
					throw new InsightError("Invalid query key in ORDER");
				}

				if (!obj.COLUMNS.includes(obj.ORDER)) {
					throw new InsightError("Ordering column is missing from requested columns");
				}
			} else {
				// obj.ORDER is a JSON object
				if (obj.ORDER.dir === null || obj.ORDER.keys === null) {
					throw new InsightError("ORDER clause is defined as object; missing required ordering keys");
				}
				if (obj.ORDER.dir !== "UP" && obj.ORDER.dir !== "DOWN") {
					throw new InsightError("ORDER clause sorting direction invalid");
				}
				if (!(obj.ORDER.keys instanceof Array) || obj.ORDER.keys.length === 0) {
					throw new InsightError("ORDER clause 'keys' should be an array of length >= 1");
				}

				for (let k of obj.ORDER.keys) {
					let keySplit: string[] = k.split("_");
					if (keySplit.length === 2) {
						if (keySplit[0] !== idToMatch) {
							throw new InsightError("ORDER key does not match requested dataset in COLUMNS");
						}
						if (!(fields.includes(keySplit[1]))) {
							throw new InsightError("ORDER key contains invalid attribute for this dataset type");
						}
					} else if (keySplit.length > 2) {
						throw new InsightError("ORDER clause contains a key with too many underscores");
					}
					if (!(obj.COLUMNS.includes(k))) {
						throw new InsightError("Ordering key is missing from requested COLUMNS");
					}
				}
			}
		}
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

	private validateTransformations(columns: string[], obj: any) {
		// TODO: Complete final component validation
		// According to EBNF, must have GROUP and APPLY when TRANSFORMATIONS is defined

		if (obj.GROUP === undefined || obj.APPLY === undefined) {
			throw new InsightError("Query TRANSFORMATIONS is missing one of GROUP or APPLY");
		}

		this.checkGroup(columns, obj.GROUP);

		this.checkApply(columns, obj.APPLY);
	}

	private checkGroup(columns: string[], obj: any) {
		if (!(obj instanceof Array) || obj.length === 0) {
			throw new InsightError("GROUP clause should be an array of length >= 1");
		}
		for (let k of obj) {
			if (!(columns.includes(k))) {
				throw new InsightError("GROUP clause contains a key not requested for in COLUMNS");
			}
		}
	}

	private checkApply(columns: string[], obj: any) {
		if (!(obj instanceof Array)) {
			throw new InsightError("APPLY clause should be an array type");
		}

		let supportedAggs: string[] = ["MAX", "MIN", "AVG", "COUNT", "SUM"];
		// obj = [ { applykey : { token: key } } ] --> o of obj = { applykey : ... } --> Object.keys(o) = ["applykey"]
		for (let o of obj) {
			if (!(columns.includes(Object.keys(o)[0]))) {
				throw new InsightError("APPLY clause contains an applykey not in requested COLUMNS");
			}

			// TODO: Debug this
			// o = { applykey: { "MAX": "courses_avg" }}
			if (!(supportedAggs.includes(Object.keys(obj[0].o)[0]))) {
				throw new InsightError("Aggregation type for APPLY column " +
					Object.keys(o)[0] + " is unsupported");
			}
		}
	}
}
