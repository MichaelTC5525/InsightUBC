import {InsightError} from "../controller/IInsightFacade";

export default class QueryOperator {
	public validateQuery(obj: any, kind: string, existingSets: string[]) {
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
		// Arbitrary reference point, all other query keys must reference this dataset ID
		let id: string = obj.OPTIONS.COLUMNS[0].split("_")[0];
		if (!existingSets.includes(id)) {
			throw new InsightError("Invalid query key in COLUMNS");
		}
		for (let c of obj.OPTIONS.COLUMNS) {
			let keyPieces: string[] = c.split("_");
			if (keyPieces[0] !== id || !validQueryKeys.includes(keyPieces[1]) || keyPieces.length !== 2) {
				throw new InsightError("Invalid query key in COLUMNS");
			}
		}

		if (obj.OPTIONS.ORDER) {
			if (obj.OPTIONS.ORDER instanceof Array) {
				throw new InsightError("Cannot sort data by more than one column");
			}
			let orderPieces: string[] = obj.OPTIONS.ORDER.split("_");
			if (orderPieces[0] !== id || !validQueryKeys.includes(orderPieces[1]) || orderPieces.length !== 2) {
				throw new InsightError("Invalid query key in ORDER");
			}

			if (!obj.OPTIONS.COLUMNS.includes(obj.OPTIONS.ORDER)) {
				throw new InsightError("Ordering column is missing from requested columns");
			}
		}

		if (Object.keys(obj.WHERE).length > 1) {
			throw new InsightError("WHERE clause should have exactly 1 key, has " + Object.keys(obj.WHERE).length);
		}
		this.validateClauseComparison(id, validQueryKeys, obj.WHERE);
	}

	private validateClauseComparison(id: string, fields: string[], obj: any) {
		if (Object.keys(obj).length === 0) {
			return;
		}
		let comp = Object.keys(obj)[0];
		let compKey: string;
		switch(comp) {
		case "GT":
			compKey = Object.keys(obj.GT)[0];
			this.checkKey(id, fields, obj.GT, compKey);
			break;
		case "LT":
			compKey = Object.keys(obj.LT)[0];
			this.checkKey(id, fields, obj.LT, compKey);
			break;
		case "EQ":
			compKey = Object.keys(obj.EQ)[0];
			this.checkKey(id, fields, obj.EQ, compKey);
			break;
		case "IS":
			compKey = Object.keys(obj.IS)[0];
			this.checkKey(id, fields, obj.IS, compKey);
			break;
		case "OR":
			if (Object.keys(obj.OR).length === 0) {
				throw new InsightError("Logic comparison wrapper array contains no filters");
			}
			for (let k = 0; k < Object.keys(obj.OR).length; k++) {
				this.validateClauseComparison(id, fields, obj.OR[k]);
			}
			break;
		case "AND":
			if (Object.keys(obj.AND).length === 0) {
				throw new InsightError("Logic comparison wrapper array contains no filters");
			}
			for (let m = 0; m < Object.keys(obj.AND).length; m++) {
				this.validateClauseComparison(id, fields, obj.AND[m]);
			}
			break;
		case "NOT":
			compKey = Object.keys(obj.NOT)[0];
			this.validateClauseComparison(id, fields, obj.NOT.valueOf());
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

	public isWithinFilter(e: any, filter: any): boolean {
		// Double-sided recursion; No key validations should be required at this point
		if (Object.keys(filter).length === 0) {
			return true;
		}
		let result: boolean = true;
		let comp = Object.keys(filter)[0];
		let compKey: string;
		switch(comp) {
		case "GT":
			compKey = Object.keys(filter.GT)[0];
			return this.evaluateComp(e, comp, compKey, filter.GT);
		case "LT":
			compKey = Object.keys(filter.LT)[0];
			return this.evaluateComp(e, comp, compKey, filter.LT);
		case "EQ":
			compKey = Object.keys(filter.EQ)[0];
			return this.evaluateComp(e, comp, compKey, filter.EQ);
		case "IS":
			compKey = Object.keys(filter.IS)[0];
			return this.evaluateComp(e, comp, compKey, filter.IS);
		case "OR":
			result = false;
			for (let i = 0; i < Object.keys(filter.OR).length; i++) {
				result ||= this.isWithinFilter(e, filter.OR[i]);
			}
			return result;
		case "AND":
			for (let j = 0; j < Object.keys(filter.AND).length; j++) {
				result &&= this.isWithinFilter(e, filter.AND[j]);
			}
			return result;
		case "NOT":
			compKey = Object.keys(filter.NOT)[0];
			return !this.isWithinFilter(e, filter.NOT.valueOf());
		default:
			throw new InsightError("Invalid filter type");
		}
	}

	private evaluateComp(entry: any, comp: string, compKey: string, obj: any): boolean {
		let fieldValue: string | number = entry[compKey];
		let refValue: string | number = (Object.values(obj)[0] as string | number);
		switch(comp) {
		case "GT":
			return fieldValue > refValue;
		case "LT":
			return fieldValue < refValue;
		case "IS":
			if ((refValue as string) === "*" || (refValue as string) === "**") {
				return true;
			} else if ((refValue as string) === "***") {
				throw new InsightError("String comparison value cannot have asterisk not in first or last pos");
			}
			// *input* case is equivalent to first nested case if-statement
			if ((refValue as string).indexOf("*") !== -1) {
				if ((refValue as string).indexOf("*") === 0) {
					if ((refValue as string).indexOf("*", 1) === (refValue as string).length - 1) {
						return (fieldValue as string).includes((refValue as string));
					} else if ((refValue as string).indexOf("*", 1) !== (refValue as string).length - 1) {
						throw new InsightError("String comparison value cannot have asterisk not in first or last pos");
					}
					return (fieldValue as string).search((refValue as string).split("*")[1]) !== -1;
				} else if ((refValue as string).indexOf("*") === (refValue as string).length - 1) {
					return (fieldValue as string).search((refValue as string).split("*")[0]) !== -1;
				} else {
					throw new InsightError("String comparison value cannot have asterisk not in first or last pos");
				}
			}
		case "EQ":
			return fieldValue === refValue;
		default:
			throw new InsightError("Invalid comparison operator");
		}
	}
}
