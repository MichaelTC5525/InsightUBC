document.getElementById("addDatasetForm").addEventListener("submit", handleAdd);
document.getElementById("removeDatasetForm").addEventListener("submit", handleRemove);
document.getElementById("performQueryButton").addEventListener("click", handleQuery);
// document.getElementById("listDatasetsButton").addEventListener("click", handleList);

async function handleAdd() {
	let id = document.getElementById("addID").value;
	let kind;
	if (document.getElementById("addCourses").checked) {
		kind = document.getElementById("addCourses").value;
	} else {
		kind = document.getElementById("addRooms").value;
	}

	// TODO: Extract actual raw content from ZIP file
	let content = document.getElementById("addFile").value;
	alert(content);
	await fetch("http://localhost:4321/dataset/" + id + "/" + kind, {
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
	).then(
		data => console.log(data)
	)
}

async function handleQuery() {
	// TODO: obtain query components from a form
	alert("TODO: Query a dataset");
	await fetch("http://localhost:4321/query", {
		method: "POST",
		body: JSON.stringify(
			{
				"WHERE": {

				},
				"OPTIONS": {
					"COLUMNS":[

					]
				}
			}
		)
	})

}

// TODO: functionally equivalent to setting HTML link to /datasets page; safe to remove if needed
// function handleList() {
// 	const httpRequest = new XMLHttpRequest();
// 	const url = "http://localhost:4321/datasets";
// 	httpRequest.open("GET", url);
// 	httpRequest.send();
//
// 	httpRequest.onreadystatechange = function() {
// 		if (this.readyState === 4 && this.status === 200) {
// 			console.log(httpRequest.responseText);
// 		}
// 	}
// }
