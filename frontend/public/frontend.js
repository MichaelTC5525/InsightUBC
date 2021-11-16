document.getElementById("addDatasetForm").addEventListener("submit", handleAdd);
document.getElementById("removeDatasetForm").addEventListener("submit", handleRemove);
document.getElementById("queryForm").addEventListener("submit", handleQuery);
document.getElementById("queryCoursesType").addEventListener("change", unlockColumns);
document.getElementById("queryRoomsType").addEventListener("change", unlockColumns);

document.getElementById("yesOrder").addEventListener("change", unlockOrders);
document.getElementById("noOrder").addEventListener("change", unlockOrders);

for (let i of document.getElementsByName("columnsCourseSelect")) {
	i.addEventListener("change", editOrderKeys);
}

for (let i of document.getElementsByName("columnsRoomSelect")) {
	i.addEventListener("change", editOrderKeys);
}

async function handleAdd() {
	let id = document.getElementById("addID").value;
	let kind;
	if (document.getElementById("addCourses").checked) {
		kind = document.getElementById("addCourses").value;
	} else {
		kind = document.getElementById("addRooms").value;
	}

	// TODO: Extract actual raw content from ZIP file

	const zipReader = document.getElementById("addFile").files[0].stream().getReader();

	let content;
	await zipReader.read().then((text) => {
		content = text.value;
	}).catch((error) => {
		console.log(error);
	});
	alert(content);
	let url = "http://localhost:4321/dataset/" + id + "/" + kind;
	alert(url);
	await fetch(url, {
		method: "PUT",
		body: content
	}).then(
		response => response.json()
	).then(
		data => console.log(data)
	);
}

async function handleRemove() {
	let setID = document.getElementById("toRemoveID").value;
	let url = "http://localhost:4321/dataset/" + setID;

	await fetch(url, {
		method: "DELETE"
	}).then(
		response => response.json()
	).then((response) => {
		// TODO: create confirmation messages?
		if (response.statusCode === 200) {
			let confirmationElement = document.createElement("p");
			let confirmationMsg = document.createTextNode("Dataset " + setID + " successfully removed from InsightUBC");
			confirmationElement.appendChild(confirmationMsg);
			document.getElementById("removeDatasetForm").appendChild(confirmationElement);
		} else {
			let errorElement = document.createElement("p");
			let errorMsg = document.createTextNode("Error " + response.statusCode + ": " + response.err);
			errorElement.appendChild(errorMsg);
			document.getElementById("removeDatasetForm").appendChild(errorElement);
		}
	});

}

async function handleQuery() {
	// TODO: obtain query components from a form
	// Default form of query, must have these pieces, even if empty
	let query = {"WHERE":{}, "OPTIONS":{"COLUMNS":[]}};

	let querySet = document.getElementById("querySet").value;

	let setTypeCourses = document.getElementById("queryCoursesType");
	let setTypeRooms = document.getElementById("queryRoomsType");

	let courseColumns = document.getElementsByName("columnsCourseSelect");
	let roomColumns = document.getElementsByName("columnsRoomSelect");

	// Columns lists will be of type HTMLElement[]
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

	await fetch("http://localhost:4321/query", {
		method: "POST",
		body: query
	}).then(
		response => response.json()
	).then(

	);
}

function unlockColumns() {
	if (document.getElementById("queryCoursesType").checked) {
		for (let column of document.getElementsByName("columnsCourseSelect")) {
			column.disabled = false;
		}
		for (let column of document.getElementsByName("columnsRoomSelect")) {
			column.disabled = true;
		}
	} else {
		for (let column of document.getElementsByName("columnsCourseSelect")) {
			column.disabled = true;
		}
		for (let column of document.getElementsByName("columnsRoomSelect")) {
			column.disabled = false;
		}
	}
}

function unlockOrders() {
	if (document.getElementById("yesOrder").checked) {
		for (let dir of document.getElementsByName("orderDir")) {
			dir.disabled = false;
		}
		for (let key of document.getElementsByName("orderKeys")) {
			key.disabled = false;
		}
	} else {
		for (let dir of document.getElementsByName("orderDir")) {
			dir.disabled = true;
		}
		for (let key of document.getElementsByName("orderKeys")) {
			key.disabled = true;
		}
	}
}

function editOrderKeys() {
	// TODO: dynamically add elements?
	let placeToPlace = document.getElementById("dynamicOrderKeysList");

	let input = document.createElement("input");
	input.setAttribute("id", )
	input.setAttribute("type", "checkbox");

	let label = document.createElement
	placeToPlace.appendChild(document.createElement())
}
