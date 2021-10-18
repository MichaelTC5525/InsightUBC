/**
 * A class used to store relevant information about rooms after being parsed by
 * the InsightFacade system
 */

import { DatasetEntry } from "./DatasetEntry";

export default class Room implements DatasetEntry{
	private roomNumber: number;
	private building: string;
	private capacity: number;

	constructor(roomNumber: number, building: string, capacity: number) {
		this.roomNumber = roomNumber;
		this.building = building;
		this.capacity = capacity;
	}

	public getField(field: string): string | number {
		switch(field) {
			case "roomNumber":
				return this.roomNumber;
			case "building":
				return this.building;
			case "capacity":
				return this.capacity;
			default:
				return -1;
		}
	}
}
