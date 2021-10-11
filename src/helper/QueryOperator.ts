import {InsightError} from "../controller/IInsightFacade";
import {DatasetEntry} from "../storageType/DatasetEntry";

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
			for (let k = 0; k < Object.keys(obj.AND).length; k++) {
				this.validateClauseComparison(id, fields, obj.AND[k]);
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
			if (strVal.indexOf("*") > 0 && strVal.indexOf("*") < strVal.length - 1) {
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

	// TODO: Evaluate query
	public isWithinFilter(entry: DatasetEntry, filter: any): boolean {
		// // Double-sided recursion
		// let queryKey: string;
		// if (filter.GT) {
		// 	queryKey = Object.keys(filter.GT)[0];
		// }
		// switch(filter) {
		// case "GT":
		// 	// queryKey = filter.GT[0];
		// 	return entry;
		// case "LT":
		// 	return entry;
		// case "EQ":
		// 	return entry;
		// case "IS":
		// 	return entry;
		// case "OR":
		// 	let result: boolean = this.isWithinFilter(entry, filter.OR[0]);
		// 	for (let i = 1; i < filter.OR.length; i++) {
		// 		result |= this.isWithinFilter(entry, filter.OR[i]);
		// 	}
		// 	return isWithinFilter(entry, filter.OR[0]) || isWithinFilter(entry, filter.OR[1]);
		// case "AND":
		// 	return this.isWithinFilter(entry, filter.AND[0]) && this.isWithinFilter(entry, filter.AND[1]);
		// default:
		// 	throw new InsightError("Invalid filter type");
		// }
		//
		return false;
	}
}
