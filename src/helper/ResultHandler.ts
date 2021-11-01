import {DatasetEntry} from "../storageType/DatasetEntry";
import Decimal from "decimal.js";
import {InsightError} from "../controller/IInsightFacade";

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

	/**
	 * Makes it such that all results from filtering are placed into a group (in the form of array) in which the
	 * attributes listed in the TRANSFORMATIONS.GROUP are the same for all the entries of that group. Does not consolidate
	 * such that entries are merged into one using the attributes of that group
	 *
	 * @param groupAttrs the attributes that must be the same for all entries in a particular group
	 * @param entries all of the filtered results, with all attributes still present
	 *
	 * @return an array of arrays; each array in the overarching one contains entries that have the same value in each
	 * of the required group attributes
	 */
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

	public aggregateResults(resultColumns: string[], applyColumns: any[], groups: any[][]): any[] {
		let retVal: any[] = [];
		if (applyColumns.length === 0) {
			for (let g of groups) {
				let obj: any = {};
				// Only need to worry about the columns in the OPTIONS.COLUMNS; GROUP array may be superset
				for (let c of resultColumns) {
					obj[c] = g[0][c];
				}
				retVal.push(obj);
			}
			return retVal;
		}

		// g = any[] = [ {"courses_dept": "math", "courses_id": "541", ...},
		// 				 {"courses_dept": "math", "courses_id": "541", ...} ]

		for (let g of groups) {
			retVal.push(this.getAggregatedEntry(resultColumns, applyColumns, g));
		}
		return retVal;
	}

	// applyColumns = any[] = [ { "columnName": { "MAX": "courses_avg" }} ]
	private getAggregatedEntry(columns: string[], applyColumns: any[], group: any[]): any {
		let aggResult: any = {};
		for (let c of columns) {
			if (c.split("_").length === 2) {
				// Add the columns that are non-aggregation columns for this group as set single values
				// Any group in the overarching groups will have at least one entry, otherwise a group wasn't created
				aggResult[c] = group[0][c];
			} else {
				let index: number = 0;
				// Aggregated column
				for (let rule of applyColumns) {
					if (Object.keys(rule)[0] === c) {
						index = applyColumns.indexOf(rule);
						break;
					}
				}
				this.handleAggColumn(aggResult, applyColumns[index], group);
			}
		}
		return aggResult;
	}

	private handleAggColumn(aggResult: any, applyColumn: any, group: any[]) {
		// applyColumn = { "applyKey": { "MAX": "courses_avg" }}
		let applyKey: string = Object.keys(applyColumn)[0];
		// aggOp = "MAX"
		let aggOp: string = Object.keys(applyColumn[applyKey])[0];
		// attrKey = "courses_avg"
		let attrKey: string = Object.values(applyColumn[applyKey])[0] as string;

		// Used as an intermediate place to run aggregations on isolated single columns
		let tempVals: any[] = [];
		for (let entry of group) {
			tempVals.push(entry[attrKey]);
		}

		let valToAdd: number = this.handleAggOp(tempVals, aggOp);
		aggResult[applyKey] = valToAdd;
	}

	private handleAggOp(tempVals: any[], aggOp: string): number {
		let valToAdd: number = 0;
		let decTotal: Decimal = new Decimal(0);
		let uniqueVals: any[] = [];
		switch (aggOp) {
			case "MAX":
				valToAdd = tempVals[0];
				for (let n = 1; n < tempVals.length; n++) {
					valToAdd = Math.max(valToAdd, tempVals[n]);
				}
				break;
			case "MIN":
				valToAdd = tempVals[0];
				for (let n = 1; n < tempVals.length; n++) {
					valToAdd = Math.min(valToAdd, tempVals[n]);
				}
				break;
			case "AVG":
				for (let v of tempVals) {
					v = new Decimal(v);
					decTotal = Decimal.add(decTotal, v);
				}
				valToAdd = Number((decTotal.toNumber() / tempVals.length).toFixed(2));
				break;
			case "COUNT":
				for (let v of tempVals) {
					if (!uniqueVals.includes(v)) {
						uniqueVals.push(v);
					}
				}
				valToAdd = uniqueVals.length;
				break;
			case "SUM":
				for (let v of tempVals) {
					v = new Decimal(v);
					decTotal = Decimal.add(decTotal, v);
				}
				valToAdd = Number(Number(decTotal).toFixed(2));
				break;
			default:
				throw new InsightError("Unreachable: aggOp should be validated");
		}
		return valToAdd;
	}
}
