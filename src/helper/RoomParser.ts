export default class RoomParser {

	public extractBuildingInfoInto(filePaths: string[], buildingNames: string[], buildingCodes: string[],
		buildingAddresses: string[], node: any) {
		// Setup base case ; sanity check that a link is only pushed if it is intending to go somewhere within ZIP
		if (node.nodeName === "a") {
			this.extractBuildingFromLink(node, filePaths, buildingNames);
		} else if (node.nodeName === "td") {
			if (node.attrs) {
				for (let attr of node.attrs) {
					if (attr.name === "class") {
						if (attr.value === "views-field views-field-field-building-code") {
							for (let n of node.childNodes) {
								if (n.nodeName === "#text") {
									// No duplicate codes
									if (!buildingCodes.includes(n.value.replace("\n", "").trim())) {
										buildingCodes.push(n.value.replace("\n", "").trim());
									}
								}
							}
						}
						if (attr.value === "views-field views-field-field-building-address") {
							for (let n of node.childNodes) {
								// Allow for locations to have the same address when not distinguished by units or other
								if (n.nodeName === "#text") {
									buildingAddresses.push(n.value.replace("\n", "").trim());
								}
							}
						}
						if (attr.value === "views-field views-field-title") {
							for (let childNode of node.childNodes) {
								this.extractBuildingInfoInto(filePaths, buildingNames, buildingCodes,
									buildingAddresses, childNode);
							}
						}
					}
				}
			}
		} else {
			if (node.childNodes) {
				for (let childNode of node.childNodes) {
					this.extractBuildingInfoInto(filePaths, buildingNames, buildingCodes, buildingAddresses, childNode);
				}
			}
		}
	}

	private extractBuildingFromLink(node: any, filePaths: string[], buildingNames: string[]) {
		if (node.attrs && node.attrs.length > 1) {
			for (let attr of node.attrs) {
				if (attr.name === "href") {
					if (attr.value.substr(0, 2) === "./") {
						if (!filePaths.includes(attr.value)) {
							filePaths.push(attr.value);
						}
					}
				}
				if (attr.name === "title") {
					if (attr.value === "Building Details and Map") {
						for (let n of node.childNodes) {
							if (n.nodeName === "#text") {
								// No duplicate names
								if (!buildingNames.includes(n.value)) {
									buildingNames.push(n.value);
								}
							}
						}
					}
				}
			}
		}
	}

	public extractRoomsInto(roomNums: string[], roomSeats: number[], roomTypes: string[], roomFurnitures: string[],
		roomHrefs: string[], node: any) {
		if (node.nodeName === "a") {
			this.extractRoomFromLink(node, roomNums, roomHrefs);
		} else if (node.nodeName === "td") {
			if (node.attrs) {
				for (let attr of node.attrs) {
					if (attr.name === "class") {
						if (attr.value === "views-field views-field-field-room-number") {
							for (let childNode of node.childNodes) {
								this.extractRoomsInto(roomNums, roomSeats, roomTypes, roomFurnitures, roomHrefs,
									childNode);
							}
						}

						if (attr.value === "views-field views-field-field-room-capacity") {
							for (let n of node.childNodes) {
								if (n.nodeName === "#text") {
									roomSeats.push(n.value.replace("\n", "").trim());
								}
							}
						}

						if (attr.value === "views-field views-field-field-room-type") {
							for (let n of node.childNodes) {
								if (n.nodeName === "#text") {
									roomTypes.push(n.value.replace("\n", "").trim());
								}
							}
						}

						if (attr.value === "views-field views-field-field-room-furniture") {
							for (let n of node.childNodes) {
								if (n.nodeName === "#text") {
									roomFurnitures.push(n.value.replace("\n", "").trim());
								}
							}
						}
					}
				}
			}
		} else {
			if (node.childNodes) {
				for (let childNode of node.childNodes) {
					this.extractRoomsInto(roomNums, roomSeats, roomTypes, roomFurnitures, roomHrefs, childNode);
				}
			}
		}
	}

	private extractRoomFromLink(node: any, roomNums: string[], roomHrefs: string[]) {
		if (node.attrs && node.attrs.length > 1) {
			for (let attr of node.attrs) {
				if (attr.name === "href") {
					if (attr.value.substr(0, 23) === "http://students.ubc.ca/") {
						if (!roomHrefs.includes(attr.value)) {
							roomHrefs.push(attr.value);
						}
					}
				}

				if (attr.name === "title") {
					if (attr.value === "Room Details") {
						for (let n of node.childNodes) {
							if (n.nodeName === "#text") {
								if (!roomNums.includes(n.value)) {
									roomNums.push(n.value);
								}
							}
						}
					}
				}
			}
		}
	}

}
