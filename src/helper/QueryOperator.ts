import {InsightError} from "../controller/IInsightFacade";
import {DatasetEntry} from "../storageType/DatasetEntry";

export default class QueryOperator {
	public validateQuery(obj: any, kind: string, existingSets: string[]) {
		if (obj.WHERE === undefined || obj.OPTIONS.COLUMNS[0] === undefined || Object.keys(obj).length > 2) {
			throw new InsightError("Query does not contain required keys, or has excess keys");
		}

		let validQueryKeys: string[] = [];
		if (kind === "courses") {
			validQueryKeys = ["dept", "id", "avg", "instr", "title", "pass", "fail", "audit", "uuid", "year"];
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
		}

		if (Object.keys(obj.WHERE).length !== 1) {
			throw new InsightError("WHERE clause should have exactly 1 key, has " + Object.keys(obj.WHERE).length);
		}
		this.validateClauseComparison(id, validQueryKeys, obj.WHERE);
	}

	private validateClauseComparison(id: string, fields: string[], obj: any) {
		let comp = Object.keys(obj)[0];
		let compKey: string;
		switch(comp) {
		case "GT":
		case "LT":
		case "EQ":
			compKey = Object.keys(obj.comp)[0];
			if (compKey.split("_").length !== 2 || compKey.split("_")[0] !== id ||
				!fields.includes(compKey.split("_")[1])) {
				throw new InsightError("WHERE clause contains invalid numerical comparison key");
			}
			if (!(obj.comp.compKey instanceof Number)) {
				throw new InsightError("WHERE clause contains numerical comparison but value is not numerical");
			}
			break;
		case "IS":
			compKey = Object.keys(obj.comp)[0];
			if (compKey.split("_").length !== 2 || compKey.split("_")[0] !== id ||
				!fields.includes(compKey.split("_")[1])) {
				throw new InsightError("WHERE clause contains invalid string comparison key");
			}
			if (!(obj.comp.compKey instanceof String)) {
				throw new InsightError("WHERE clause contains string comparison but value is not string");
			}
			break;
		case "OR":
		case "AND":
		case "NOT":
			for (let k of Object.keys(obj.comp)) {
				this.validateClauseComparison(id, fields, obj.comp.k);
			}
			break;
		default:
			throw new InsightError("WHERE clause contains unsupported logic / comparison type");
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
