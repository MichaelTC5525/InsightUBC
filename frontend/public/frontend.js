document.getElementById("addDatasetForm").addEventListener("submit", handleAdd);
document.getElementById("removeDatasetForm").addEventListener("submit", handleRemove);
document.getElementById("queryForm").addEventListener("submit", handleQuery);
document.getElementById("queryCoursesType").addEventListener("change", unlockColumns);
document.getElementById("queryRoomsType").addEventListener("change", unlockColumns);

document.getElementById("yesOrder").addEventListener("change", unlockOrders);
document.getElementById("noOrder").addEventListener("change", unlockOrders);

document.getElementById("yesGroup").addEventListener("change", unlockGroups);
document.getElementById("noGroup").addEventListener("change", unlockGroups);

for (let e of document.getElementsByName("columnsCourseOrder")) {
	e.addEventListener("change", unlockOrderNums);
}

for (let e of document.getElementsByName("columnsRoomOrder")) {
	e.addEventListener("change", unlockOrderNums);
}

// https://gist.github.com/synthet1c/9019ad368f2c814838654115322ec198
function readFile(selector) {
	const input = document.querySelector(selector)
	return new Promise((resolve, reject) => {
		const read = e => {
			const reader = new FileReader()
			reader.onload = () => resolve({
				contents: reader.result,
				name: input.value.slice(input.value.lastIndexOf('\\') + 1)
			})
			reader.onerror = reject
			reader.readAsArrayBuffer(input.files[0])
		}
		input.addEventListener('change', read)
	})
}

async function handleAdd() {
	let id = document.getElementById("addID").value;
	let kind;
	if (document.getElementById("addCourses").checked) {
		kind = document.getElementById("addCourses").value;
	} else {
		kind = document.getElementById("addRooms").value;
	}

	// // TODO: Extract actual raw content from ZIP file
	// let reader = new FileReader();
	// await reader.readAsArrayBuffer(document.getElementById("addFile").files[0]);
	alert("Here we go");
	let content = await readFile('#addFile')
	console.log(content);
	let url = "http://localhost:4321/dataset/" + id + "/" + kind;
	const response = await fetch(url, {
		method: "PUT",
		body: content
	}).json();

	if (response.result) {
		alert("Dataset " + id + " was successfully added; current set IDs are:\n[" + response.result + "]");
	} else {
		alert(response.error);
	}
}

async function previewFile() {
	const content = document.querySelector('#addFile');
	const [file] = document.querySelector('input[type=file]').files;
	const reader = new FileReader();

	reader.addEventListener("load", () => {
		// this will then display a text file
		content.innerText = reader.result;
	}, false);

	if (file) {
		await reader.readAsText(file);
	}
	return content.innerText;
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

	// TODO: Get the ordering keys, use colnums to decide which to put through first into the ORDER.keys array

	if (document.getElementById("yesOrder").checked) {
		query.OPTIONS.ORDER = {};
		if (document.getElementById("upOrder").checked) {
			query.OPTIONS.ORDER.dir = "UP";
		} else {
			query.OPTIONS.ORDER.dir = "DOWN";
		}
	}

	alert(query);
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
			// TODO: determine how to display queried results
			alert(response.result);
		} else {
			alert(response.error);
		}
	});
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
			}
		} else if (document.getElementById("queryRoomsType").checked) {
			for (let key of document.getElementsByName("columnsRoomOrder")) {
				key.disabled = false;
			}
		}

	} else {
		for (let dir of document.getElementsByName("orderDir")) {
			dir.disabled = true;
		}

		for (let key of document.getElementsByName("columnsCourseOrder")) {
			key.disabled = true;
		}

		for (let key of document.getElementsByName("columnsRoomOrder")) {
			key.disabled = true;
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

function unlockGroups() {
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

	} else {
		for (let key of document.getElementsByName("columnsCourseGroup")) {
			key.disabled = true;
		}

		for (let key of document.getElementsByName("columnsRoomGroup")) {
			key.disabled = true;
		}
	}
}

