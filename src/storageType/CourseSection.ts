/**
 * A class used to store relevant information about course sections after being parsed by
 * the InsightFacade system
 */

import {DatasetEntry} from "./DatasetEntry";

export default class CourseSection implements DatasetEntry {
	private dept: string;
	private id: string;
	private avg: number;
	private instr: string;
	private title: string;
	private pass: number;
	private fail: number;
	private audit: number;
	private uuid: string;
	private year: number;

	constructor(
		dept: string,
		id: string,
		avg: number,
		instr: string,
		title: string,
		pass: number,
		fail: number,
		audit: number,
		uuid: string,
		year: number
	) {
		this.dept = dept;
		this.id = id;
		this.avg = avg;
		this.instr = instr;
		this.title = title;
		this.pass = pass;
		this.fail = fail;
		this.audit = audit;
		this.uuid = uuid;
		this.year = year;
	}

	public getField(field: string): string | number {
		switch (field) {
			case "dept":
				return this.dept;
			case "id":
				return this.id;
			case "avg":
				return this.avg;
			case "instr":
				return this.instr;
			case "title":
				return this.title;
			case "pass":
				return this.pass;
			case "fail":
				return this.fail;
			case "audit":
				return this.audit;
			case "uuid":
				return this.uuid;
			case "year":
				return this.year;
			default:
				return -1;
		}
	}
}
