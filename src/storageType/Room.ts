/**
 * A class used to store relevant information about rooms after being parsed by
 * the InsightFacade system
 */

import { DatasetEntry } from "./DatasetEntry";

export default class Room implements DatasetEntry{
	private readonly fullName: string;
	private readonly shortName: string;
	private readonly number: string;
	private readonly name: string;
	private readonly address: string;
	private readonly lat: number;
	private readonly lon: number;
	private readonly seats: number;
	private readonly type: string;
	private readonly furniture: string;
	private readonly href: string

	constructor(fullName: string, shortName: string, number: string, address: string, lat: number,
		lon: number, seats: number, type: string, furniture: string, href: string) {
		this.fullName = fullName;
		this.shortName = shortName;
		this.number = number;
		this.name = shortName + "_" + number;
		this.address = address;
		this.lat = lat;
		this.lon = lon;
		this.seats = seats;
		this.type = type;
		this.furniture = furniture;
		this.href = href;
	}

	public getField(field: string): string | number {
		switch(field) {
			case "fullName":
				return this.fullName;
			case "shortName":
				return this.shortName;
			case "number":
				return this.number;
			case "name":
				return this.name;
			case "address":
				return this.address;
			case "lat":
				return this.lat;
			case "lon":
				return this.lon;
			case "seats":
				return this.seats;
			case "type":
				return this.type;
			case "furniture":
				return this.furniture;
			case "href":
				return this.href;
			default:
				return -1;
		}
	}
}
