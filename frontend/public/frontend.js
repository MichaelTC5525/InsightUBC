document.getElementById("listDatasetsButton").addEventListener("click", handleList)

document.getElementById("addDatasetForm").addEventListener("submit", handleAdd);
document.getElementById("removeDatasetForm").addEventListener("submit", handleRemove);
document.getElementById("queryForm").addEventListener("submit", handleQuery);
document.getElementById("queryCoursesType").addEventListener("change", unlockColumns);
document.getElementById("queryRoomsType").addEventListener("change", unlockColumns);

document.getElementById("yesOrder").addEventListener("change", unlockOrders);
document.getElementById("noOrder").addEventListener("change", unlockOrders);

document.getElementById("yesGroup").addEventListener("change", unlockGroupsAndAggs);
document.getElementById("noGroup").addEventListener("change", unlockGroupsAndAggs);

for (let e of document.getElementsByName("columnsCourseOrder")) {
	e.addEventListener("change", unlockOrderNums);
}

for (let e of document.getElementsByName("columnsRoomOrder")) {
	e.addEventListener("change", unlockOrderNums);
}

async function handleList(event) {
	event.preventDefault();

	let url = "http://localhost:4321/datasets";
	await fetch(url, {
		method: "GET"
	}).then(
		response => response.json()
	).then((response) => {
		let datasets = "";
		for (let i = 0; i < response.result.length - 1; i++) {
			datasets += (i + 1) + ". " + response.result[i].id + " - Type: " +
				response.result[i].kind + " - Number of entries: " + response.result[i].numRows + "\n";
		}
		if (response.result.length >= 1) {
			datasets += (response.result.length) + ". " + response.result[response.result.length - 1].id +
				" - Type: " + response.result[response.result.length - 1].kind +
				" - Number of entries: " + response.result[response.result.length - 1].numRows;
		}
		if (datasets !== "") {
			alert("The current dataset IDs present in InsightUBC are: \n" + datasets);
		} else {
			alert("No datasets found in InsightUBC. Add some new ones!");
		}
	});
}

async function handleAdd(event) {
	event.preventDefault();

	let id = document.getElementById("addID").value;
	let kind;
	if (document.getElementById("addCourses").checked) {
		kind = document.getElementById("addCourses").value;
	} else {
		kind = document.getElementById("addRooms").value;
	}

	let url = "http://localhost:4321/dataset/" + id + "/" + kind;
	await fetch(url, {
		method: "PUT",
		body: document.getElementById("addFile").files[0]
	}).then(
		response => response.json()
	).then((response) => {
		if (response.result) {
			alert("Dataset \"" + id + "\" was successfully added; current set IDs are:\n[" + response.result + "]");

			// Force reload
			document.location = document.location;
		} else {
			alert(response.error);
		}
	});
}

async function handleRemove() {
	let setID = document.getElementById("toRemoveID").value;
	let url = "http://localhost:4321/dataset/" + setID;

	await fetch(url, {
		method: "DELETE"
	}).then(
		response => response.json()
	).then((response) => {
		if (response.result) {
			alert("Dataset \"" + response.result + "\" successfully removed from InsightUBC");
		} else {
			alert(response.error);
		}
	});

}

function buildFilter(querySet, column, type, value, isNot) {
	let retVal = {};
	switch(type) {
		case "GTE":
			retVal = {"OR":[{"GT":{}},{"EQ":{}}]};
			retVal.OR[0].GT[querySet + column] = Number(value);
			retVal.OR[1].EQ[querySet + column] = Number(value);
			break;
		case "LTE":
			retVal = {"OR":[{"LT":{}},{"EQ":{}}]};
			retVal.OR[0].LT[querySet + column] = Number(value);
			retVal.OR[1].EQ[querySet + column] = Number(value);
			break;
		case "IS":
			retVal[type] = {};
			retVal[type][querySet + column] = value;
			break;
		default:
			retVal[type] = {};
			retVal[type][querySet + column] = Number(value);
	}

	if (isNot) {
		// Slap on a NOT clause
		let flipRetVal = {};
		flipRetVal.NOT = retVal;
		retVal = flipRetVal;
	}

	return retVal;
}

async function handleQuery(event) {
	// No reloading the page, allow for adding DOM elements
	event.preventDefault();

	// Default form of query, must have these pieces, even if empty
	let query = {"WHERE":{}, "OPTIONS":{"COLUMNS":[]}};

	let querySet = document.getElementById("querySet").value;

	let setTypeCourses = document.getElementById("queryCoursesType");
	let setTypeRooms = document.getElementById("queryRoomsType");

	let courseColumns = document.getElementsByName("columnsCourseSelect");
	let roomColumns = document.getElementsByName("columnsRoomSelect");

	let numFilters = 0;
	let filterList = [];
	for (let i = 0; i < document.getElementsByName("filterColumns").length; i++) {
		let col = document.getElementById("filterColumn" + i).value;
		let type = document.getElementById("filterType" + i).value;
		let value = document.getElementById("filterVal" + i).value;
		if (col === "" || type === "" || value === "") {
			continue;
		}

		numFilters++;
		if (document.getElementById("filterNot" + i).checked) {
			filterList.push(buildFilter(querySet, col, type, value, true));
		} else {
			filterList.push(buildFilter(querySet, col, type, value, false));
		}

	}

	if (numFilters > 1) {
		query.WHERE.AND = filterList;
	} else if (numFilters === 1) {
		query.WHERE = filterList[0];
	}

	// Columns lists will be of type HTMLInputElement[] with the checked option because of type="checkbox"
	if (setTypeCourses.checked) {
		for (let cc of courseColumns) {
			if (cc.checked) {
				query.OPTIONS.COLUMNS.push(querySet + cc.value);
			}
		}
	} else if (setTypeRooms.checked) {
		for (let rc of roomColumns) {
			if (rc.checked) {
				query.OPTIONS.COLUMNS.push(querySet + rc.value);
			}
		}
	}

	if (document.getElementById("yesOrder").checked) {
		query.OPTIONS.ORDER = {};
		if (document.getElementById("upOrder").checked) {
			query.OPTIONS.ORDER.dir = "UP";
		} else {
			query.OPTIONS.ORDER.dir = "DOWN";
		}

		query.OPTIONS.ORDER.keys = getOrderKeys(querySet);
	}

	if (document.getElementById("yesGroup").checked) {
		query.TRANSFORMATIONS = {};
		query.TRANSFORMATIONS.GROUP = [];
		query.TRANSFORMATIONS.APPLY = [];

		for (let g of document.getElementsByName("columnsCourseGroup")) {
			if (!g.disabled && g.checked) {
				query.TRANSFORMATIONS.GROUP.push(querySet + g.value);
			}
		}

		for (let g of document.getElementsByName("columnsRoomGroup")) {
			if (!g.disabled && g.checked) {
				query.TRANSFORMATIONS.GROUP.push(querySet + g.value);
			}
		}

		query.TRANSFORMATIONS.APPLY = getAggColumns(query.OPTIONS.COLUMNS, querySet);
	}

	await fetch("http://localhost:4321/query", {
		method: "POST",
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(query)
	}).then(
		response => response.json()
	).then((response) => {
		if (response.result) {
			displayResults(response.result);
		} else {
			alert(response.error);
		}
	});
}

function getOrderKeys(querySet) {
	let retVal = [];
	let courseOrder = document.getElementsByName("orderCourseColumnNumbers");
	let roomOrder = document.getElementsByName("orderRoomColumnNumbers");

	// First pass, obtain the values inputted to the Order Key # boxes
	let vals = [];
	if (document.getElementById("queryCoursesType").checked) {
		for (let colNum of courseOrder) {
			if (!colNum.disabled) {
				vals.push(colNum.value);
			}
		}
	} else {
		for (let colNum of roomOrder) {
			if (!colNum.disabled) {
				vals.push(colNum.value);
			}
		}
	}
	vals.sort();
	// Second pass; get the columns to order on, and place them into the query IN ORDER
	for (let v of vals) {
		if (document.getElementById("queryCoursesType").checked) {
			for (let colNum of courseOrder) {
				if (colNum.value === v) {
					retVal.push(querySet + document.getElementById(colNum.id.split("_")[0]).value)
				}
			}
		} else {
			for (let colNum of roomOrder) {
				if (colNum.value === v) {
					retVal.push(querySet + document.getElementById(colNum.id.split("_")[0]).value)
				}
			}
		}
	}
	return retVal;
}

function getAggColumns(columns, querySet) {
	let retVal = [];
	let indexInList = 0;
	for (let agg of document.getElementsByName("aggNames")) {
		if (agg.value === "") {
			indexInList++;
			continue;
		}
		let aggToAdd = {};
		aggToAdd[agg.value] = {};

		let aggType = document.getElementById("aggType" + indexInList).value;
		aggToAdd[agg.value][aggType] = querySet + document.getElementById("aggColumn" + indexInList).value;

		retVal.push(aggToAdd);
		columns.push(agg.value);

		indexInList++;
	}

	return retVal;
}

function displayResults(results) {
	if (document.getElementById("results") !== null) {
		let endpageLineBrs = document.getElementsByTagName("br");
		document.body.removeChild(endpageLineBrs[endpageLineBrs.length - 2]);
		document.body.removeChild(document.querySelector("#resultHeader"));
		document.body.removeChild(endpageLineBrs[endpageLineBrs.length - 1]);
		document.body.removeChild(document.querySelector("#results"));
	}

	document.body.appendChild(document.createElement("br"));
	let resultHeader = document.createElement("h2");
	resultHeader.setAttribute("id", "resultHeader");
	resultHeader.appendChild(document.createTextNode("RESULT"));

	document.body.appendChild(resultHeader);

	if (results.length === 0) {
		return;
	}

	let resultTable = document.createElement("table");
	resultTable.setAttribute("id", "results");
	let thead = document.createElement("thead");
	resultTable.appendChild(thead);
	let theadRow = document.createElement("tr");
	thead.appendChild(theadRow);
	for (let r of Object.keys(results[0])) {
		let theadEntry = document.createElement("th");
		theadEntry.setAttribute("class", "borderedHeader")
		let theadText = document.createTextNode(r);
		theadEntry.appendChild(theadText);

		theadRow.appendChild(theadEntry);
	}

	let tbody = document.createElement("tbody");
	resultTable.appendChild(tbody);

	for (let r of results) {
		let row = document.createElement("tr");
		for (let k of Object.keys(results[0])) {
			let tdata = document.createElement("td");
			tdata.setAttribute("class", "resultData borderedCell");
			let dataTxt = document.createTextNode(r[k]);
			tdata.appendChild(dataTxt);
			row.appendChild(tdata);
		}
		tbody.appendChild(row);
	}

	document.body.appendChild(document.createElement("br"));
	document.body.appendChild(resultTable);
}

function unlockColumns() {
	if (document.getElementById("queryCoursesType").checked) {
		for (let column of document.getElementsByName("columnsCourseSelect")) {
			column.disabled = false;
		}
		for (let column of document.getElementsByName("columnsRoomSelect")) {
			column.disabled = true;
		}

		if (document.getElementById("yesOrder").checked) {
			for (let key of document.getElementsByName("columnsCourseOrder")) {
				key.disabled = false;
			}
			for (let key of document.getElementsByName("columnsRoomOrder")) {
				key.disabled = true;
			}

			unlockOrderNums();
		}

		if (document.getElementById("yesGroup").checked) {
			for (let key of document.getElementsByName("columnsCourseGroup")) {
				key.disabled = false;
			}
			for (let key of document.getElementsByName("columnsRoomGroup")) {
				key.disabled = true;
			}
		}
	} else {
		for (let column of document.getElementsByName("columnsCourseSelect")) {
			column.disabled = true;
		}
		for (let column of document.getElementsByName("columnsRoomSelect")) {
			column.disabled = false;
		}

		if (document.getElementById("yesOrder").checked) {
			for (let key of document.getElementsByName("columnsRoomOrder")) {
				key.disabled = false;
			}
			for (let key of document.getElementsByName("columnsCourseOrder")) {
				key.disabled = true;
			}

			unlockOrderNums();
		}

		if (document.getElementById("yesGroup").checked) {
			for (let key of document.getElementsByName("columnsCourseGroup")) {
				key.disabled = true;
			}

			for (let key of document.getElementsByName("columnsRoomGroup")) {
				key.disabled = false;
			}
		}
	}
}

function unlockOrders() {
	if (document.getElementById("yesOrder").checked) {
		for (let dir of document.getElementsByName("orderDir")) {
			dir.disabled = false;
		}

		if (document.getElementById("queryCoursesType").checked) {
			for (let key of document.getElementsByName("columnsCourseOrder")) {
				key.disabled = false;
				unlockOrderNums();
			}
		} else if (document.getElementById("queryRoomsType").checked) {
			for (let key of document.getElementsByName("columnsRoomOrder")) {
				key.disabled = false;
				unlockOrderNums();
			}
		}

	} else {
		for (let dir of document.getElementsByName("orderDir")) {
			dir.disabled = true;
		}

		for (let key of document.getElementsByName("columnsCourseOrder")) {
			key.disabled = true;
			unlockOrderNums();
		}

		for (let key of document.getElementsByName("columnsRoomOrder")) {
			key.disabled = true;
			unlockOrderNums();
		}
	}
}

function unlockOrderNums() {
	for (let e of document.getElementsByName("columnsCourseOrder")) {
		if (e.checked && !e.disabled) {
			document.getElementById(e.id + "_colnum").disabled = false;
			document.getElementById(e.id + "_colnum").required = true;
		} else {
			document.getElementById(e.id + "_colnum").disabled = true;
			document.getElementById(e.id + "_colnum").required = false;
		}
	}

	for (let f of document.getElementsByName("columnsRoomOrder")) {
		if (f.checked && !f.disabled) {
			document.getElementById(f.id + "_colnum").disabled = false;
			document.getElementById(f.id + "_colnum").required = true;
		} else {
			document.getElementById(f.id + "_colnum").disabled = true;
			document.getElementById(f.id + "_colnum").required = false;
		}
	}
}

function unlockGroupsAndAggs() {
	if (document.getElementById("yesGroup").checked) {
		if (document.getElementById("queryCoursesType").checked) {
			for (let key of document.getElementsByName("columnsCourseGroup")) {
				key.disabled = false;
			}
		} else if (document.getElementById("queryRoomsType").checked) {
			for (let key of document.getElementsByName("columnsRoomGroup")) {
				key.disabled = false;
			}
		}

		for (let name of document.getElementsByName("aggNames")) {
			name.disabled = false;
		}

		for (let type of document.getElementsByName("aggTypes")) {
			type.disabled = false;
		}

		for (let aggCol of document.getElementsByName("aggOnColumn")) {
			aggCol.disabled = false;
		}

	} else {
		for (let key of document.getElementsByName("columnsCourseGroup")) {
			key.disabled = true;
		}

		for (let key of document.getElementsByName("columnsRoomGroup")) {
			key.disabled = true;
		}

		for (let name of document.getElementsByName("aggNames")) {
			name.disabled = true;
		}

		for (let type of document.getElementsByName("aggTypes")) {
			type.disabled = true;
		}

		for (let aggCol of document.getElementsByName("aggOnColumn")) {
			aggCol.disabled = true;
		}
	}
}

