import {InsightError} from "../controller/IInsightFacade";
import KeyValidator from "./KeyValidator";

export default class QueryValidator {
	public validateQuery(id: string, obj: any, kind: string, existingSets: string[]) {
		if (obj.WHERE === undefined || obj.OPTIONS.COLUMNS[0] === undefined || Object.keys(obj).length > 3) {
			throw new InsightError("Query does not contain required keys, or has excess keys");
		}

		let validQueryKeys: string[] = [];
		if (kind === "courses") {
			validQueryKeys = ["dept", "id", "avg", "instructor", "title", "pass", "fail", "audit", "uuid", "year"];
		} else if (kind === "rooms") {
			validQueryKeys = ["fullname", "shortname", "number", "name", "address", "lat", "lon", "seats", "type",
				"furniture", "href"];
		} else {
			throw new InsightError("Invalid dataset kind in validating query");
		}

		this.validateOptions(id, validQueryKeys, obj.OPTIONS);
		if (!existingSets.includes(id)) {
			throw new InsightError("Invalid query key in COLUMNS");
		}

		this.validateWhereFilter(id, validQueryKeys, obj.WHERE);

		let columnsNeeded: string[] = [];
		for (let c of obj.OPTIONS.COLUMNS) {
			columnsNeeded.push(c);
		}
		if (obj.TRANSFORMATIONS !== undefined) {
			columnsNeeded = this.validateTransformations(id, validQueryKeys, columnsNeeded, obj.TRANSFORMATIONS);
			if (columnsNeeded.length > 0) {
				throw new InsightError("Not all COLUMNS are assigned to a " +
					" TRANSFORMATIONS.GROUP key or TRANSFORMATIONS.APPLY applykey");
			}
		}
	}

	private validateOptions(id: string, fields: string[], obj: any) {
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
				if (keyPieces[0] !== id) {
					throw new InsightError("Invalid dataset ID found in COLUMNS");
				}
			} else if (keyPieces.length > 2) {
				throw new InsightError("Query key in COLUMNS contains multiple underscores");
			}
		}
		this.validateOrder(id, fields, obj);
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
					throw new InsightError("ORDER clause is defined as object; missing required ordering info");
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
		let keyValidator: KeyValidator = new KeyValidator();
		switch(comp) {
			case "GT":
			case "LT":
			case "EQ":
			case "IS":
				compKey = Object.keys(obj[comp])[0];
				keyValidator.checkKey(id, fields, obj[comp], comp, compKey);
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

	private validateTransformations(id: string, fields: string[], columns: string[], obj: any): string[] {
		// According to EBNF, must have GROUP and APPLY when TRANSFORMATIONS is defined
		if (obj.GROUP === undefined || obj.APPLY === undefined) {
			throw new InsightError("Query TRANSFORMATIONS is missing one of GROUP or APPLY");
		}
		columns = this.checkGroup(id, fields, columns, obj.GROUP);
		columns = this.checkApply(id, fields, columns, obj.APPLY);
		return columns;
	}

	private checkGroup(id: string, fields: string[], columns: string[], obj: any): string[] {
		if (!(obj instanceof Array) || obj.length === 0) {
			throw new InsightError("GROUP clause should be an array of length >= 1");
		}
		for (let k of obj) {
			if (columns.includes(k)) {
				columns.splice(columns.indexOf(k), 1);
			}
			let kPieces: string[] = k.split("_");
			if (kPieces.length !== 2 || kPieces[0] !== id || !(fields.includes(kPieces[1]))) {
				throw new InsightError("GROUP clause contains a non-dataset key");
			}
		}
		return columns;
	}

	private checkApply(id: string, fields: string[], columns: string[], obj: any): string[] {
		if (!(obj instanceof Array)) {
			throw new InsightError("APPLY clause should be an array type");
		}
		let supportedAggs: string[] = ["MAX", "MIN", "AVG", "COUNT", "SUM"];
		// Used to ensure applyKey uniqueness
		let applyKeys: string[] = [];
		// obj = [ { applykey : { token: key } } ] --> o of obj = { applykey : ... } --> Object.keys(o) = ["applykey"]
		for (let o of obj) {
			// o = { applykey: { "MAX": "courses_avg" }}
			let applyKey: string = Object.keys(o)[0]; // There should only be a first element, no more
			if (applyKeys.includes(applyKey)) {
				throw new InsightError("APPLY clause contains duplicate applyKeys; an aggregated column can only" +
				" take on a single aggregation operation");
			}
			if (columns.includes(applyKey)) {
				columns.splice(columns.indexOf(applyKey), 1);
			}

			// o[applyKey] = { "MAX": "courses_avg" } ; "MAX" is the only key at 0th element
			if (!(supportedAggs.includes(Object.keys(o[applyKey])[0]))) {
				throw new InsightError("Aggregation type for APPLY column " +
					applyKey + " is unsupported");
			}

			let aggValue: string = (Object.values(o[applyKey])[0] as string);
			let aggValueArray: string[] = aggValue.split("_");
			if (aggValueArray.length !== 2 || aggValueArray[0] !== id || !(fields.includes(aggValueArray[1]))) {
				throw new InsightError("APPLY column " + applyKey +
					" performs aggregation on an invalid query key");
			}
			this.checkAggOp(Object.keys(o[applyKey])[0], aggValueArray[1]);

			applyKeys.push(applyKey);
		}
		return columns;
	}

	private checkAggOp(op: string, key: string) {
		switch(op) {
			case "MAX":
			case "MIN":
			case "AVG":
			case "SUM":
				switch(key) {
					// Course string fields
					case "dept":
					case "id":
					case "instructor":
					case "title":
					case "uuid":
					// Room string fields
					case "fullname":
					case "shortname":
					case "name":
					case "address":
					case "type":
					case "furniture":
					case "href":
						throw new InsightError(op + " aggregation operator not compatible with query key");
				}
				break;
			default:
				break;
		}
	}
}
