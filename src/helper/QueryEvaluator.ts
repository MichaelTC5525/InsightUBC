import {InsightError} from "../controller/IInsightFacade";

export default class QueryEvaluator {

	public filterResults(data: string[], obj: any): string[] {
		// Remove first line "courses" / "rooms" and last empty newline
		let retData: string[] = [];
		data.splice(0, 1);
		data.splice(data.length - 1, 1);
		for (let d of data) {
			try {
				let r = JSON.parse(d);
				if (this.isWithinFilter(r, obj)) {
					retData.push(d);
				}
			} catch (error) {
				if (error instanceof SyntaxError) {
					throw new InsightError("Requested dataset has an invalidly formatted row, check the " +
						"relevant .txt file or remove/re-add this dataset");
				}
				throw error;
			}
		}

		return retData;
	}

	private isWithinFilter(e: any, filter: any): boolean {
		// Double-sided recursion; No key validations should be required at this point
		if (Object.keys(filter).length === 0) {
			return true;
		}
		let result: boolean = true;
		let comp = Object.keys(filter)[0];
		let compKey: string;
		switch(comp) {
			case "GT":
			case "LT":
			case "EQ":
			case "IS":
				compKey = Object.keys(filter[comp])[0];
				return this.evaluateComp(e, comp, compKey, filter[comp]);
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

				if ((refValue as string).indexOf("*") !== -1) {
					if ((refValue as string).indexOf("*") === 0) {
						if ((refValue as string).indexOf("*", 1) === (refValue as string).length - 1) {
							return (fieldValue as string).includes((refValue as string).split("*")[1]);
						} else if ((refValue as string).indexOf("*", 1) > 0 &&
							(refValue as string).indexOf("*", 1) !== (refValue as string).length - 1) {
							throw new InsightError("String comparison value cannot have asterisk within edges");
						}
						// abcd length 4 - ("*d" -> d length 1) = abcd index 3
						return (fieldValue as string).indexOf((refValue as string).split("*")[1]) ===
							(fieldValue as string).length - (refValue as string).split("*")[1].length;
					} else if ((refValue as string).indexOf("*") === (refValue as string).length - 1) {
						// Searching for the refValue in the string must be at the beginning
						return (fieldValue as string).indexOf((refValue as string).split("*")[0]) === 0;
					} else {
						throw new InsightError("String comparison value cannot have asterisk within edges");
					}
				}
			case "EQ":
				return fieldValue === refValue;
			default:
				throw new InsightError("Invalid comparison operator");
		}
	}
}
