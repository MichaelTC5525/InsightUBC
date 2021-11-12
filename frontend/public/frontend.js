document.getElementById("addDatasetButton").addEventListener("click", handleAdd);
document.getElementById("removeDatasetButton").addEventListener("click", handleRemove);
document.getElementById("performQueryButton").addEventListener("click", handleQuery);
// document.getElementById("listDatasetsButton").addEventListener("click", handleList);

function handleAdd() {
	alert("TODO: Add a dataset");
}

function handleRemove() {
	alert("TODO: Remove a dataset");
}

function handleQuery() {
	alert("TODO: Query a dataset");
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
