import {
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	NotFoundError,
	ResultTooLargeError
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";

import * as fs from "fs-extra";

import {testFolder} from "@ubccpsc310/folder-test";
import {expect} from "chai";
import {fail} from "assert";

describe("InsightFacade", function () {
	let insightFacade: InsightFacade;

	const persistDir = "./data";
	const datasetContents = new Map<string, string>();

	// Reference any datasets you've added to test/resources/archives here and they will
	// automatically be loaded in the 'before' hook.
	const datasetsToLoad: {[key: string]: string} = {
		courses: "./test/resources/archives/courses.zip",
		courses1: "./test/resources/archives/validSet.zip",
		courses2: "./test/resources/archives/set5000.zip",
		emptySet: "./test/resources/archives/emptySet.zip",
		ignoreFolderSet: "./test/resources/archives/ignoreFolderSet.zip",
		invalidSetDir: "./test/resources/archives/invalidSetDir.zip",
		invalidSetJSON: "./test/resources/archives/invalidSetJSON.zip",
		skipOverSet: "./test/resources/archives/skipOverSet.zip",
		rooms: "./test/resources/archives/rooms.zip",
		ignoreFolderRoomsSet: "./test/resources/archives/ignoreFolderRoomsSet.zip",
		missingIndex: "./test/resources/archives/missingIndex.zip",
		missingBuildingFiles: "./test/resources/archives/missingBuildingFiles.zip"
	};

	before(function () {
		// This section runs once and loads all datasets specified in the datasetsToLoad object
		for (const key of Object.keys(datasetsToLoad)) {
			const content = fs.readFileSync(datasetsToLoad[key]).toString("base64");
			datasetContents.set(key, content);
		}
		// Just in case there is anything hanging around from a previous run
		fs.removeSync(persistDir);
	});

	describe("Add/Remove/List Dataset", function () {
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);
		});

		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			console.info(`BeforeTest: ${this.currentTest?.title}`);
			insightFacade = new InsightFacade();
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
		});

		afterEach(function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent from the previous one
			console.info(`AfterTest: ${this.currentTest?.title}`);
			fs.removeSync(persistDir);
		});

		describe("InsightFacade.addDataset Test Cases", function () {
			context("Success: Add a dataset of type Courses to a new database", () => {
				it("Should have a single course dataset ID in the database", () => {
					const id: string = "courses1";
					const content: string = datasetContents.get("courses1") ?? "";
					const expected: string[] = [id];
					return insightFacade.addDataset(id, content, InsightDatasetKind.Courses)
						.then((result: string[]) => {
							expect(result).to.deep.equal(expected);
						});
				});
			});

			context("Success: Add a dataset of type Rooms to a new database", () => {
				it("Should have a single room dataset ID in the database", () => {
					const id: string = "rooms";
					const content: string = datasetContents.get("rooms") ?? "";
					const expected: string[] = [id];
					return insightFacade.addDataset(id, content, InsightDatasetKind.Rooms)
						.then((result: string[]) => {
							expect(result).to.deep.equal(expected);
						});
				});
			});

			context("Success: Add a Courses dataset to a database with one existing Courses dataset", () => {
				it("Should have 2 course dataset IDs in the database", async () => {
					const content: string = datasetContents.get("courses1") ?? "";
					const expected: string[] = ["1", "2"];
					// Add one dataset successfully beforehand
					await insightFacade.addDataset("1", content, InsightDatasetKind.Courses);
					return insightFacade.addDataset("2", content, InsightDatasetKind.Courses)
						.then((result: string[]) => {
							expect(result).to.deep.equal(expected);
						});
				});
			});

			context("Success: Add a Rooms dataset to a database with one existing Rooms dataset", () => {
				it("Should have 2 room dataset IDs in the database", async () => {
					const content: string = datasetContents.get("rooms") ?? "";
					const expected: string[] = ["1", "2"];
					// Add one dataset successfully beforehand
					await insightFacade.addDataset("1", content, InsightDatasetKind.Rooms);
					return insightFacade.addDataset("2", content, InsightDatasetKind.Rooms)
						.then((result: string[]) => {
							expect(result).to.deep.equal(expected);
						});
				});
			});

			context("Success: Add a dataset to a database with multiple existing datasets", () => {
				it("Should have more than 2 dataset IDs in the database", async () => {
					const content: string = datasetContents.get("courses1") ?? "";
					const expected: string[] = ["1", "2", "3"];
					// Add two datasets successfully beforehand
					await insightFacade.addDataset("1", content, InsightDatasetKind.Courses);
					await insightFacade.addDataset("2", content, InsightDatasetKind.Courses);
					return insightFacade.addDataset("3", content, InsightDatasetKind.Courses)
						.then((result: string[]) => {
							expect(result).to.deep.equal(expected);
						});
				});
			});

			context("Success: Add datasets to the database, one of each type", () => {
				it("Should be able to store both types of datasets simultaneously", async () => {
					const id: string = "courses1";
					const id1: string = "rooms";
					const content: string = datasetContents.get("courses1") ?? "";
					const content1: string = datasetContents.get("rooms") ?? "";
					const expected: string[] = [id, id1];
					await insightFacade.addDataset(id, content, InsightDatasetKind.Courses);
					return insightFacade.addDataset(id1, content1, InsightDatasetKind.Rooms)
						.then((result: string[]) => {
							expect(result).to.deep.equal(expected);
						});
				});
			});

			context("Success: Add a Courses dataset while skipping over an invalid file", () => {
				it("Should add a dataset with no error, with results from only valid files", () => {
					const content: string = datasetContents.get("skipOverSet") ?? "";
					const expected: string[] = ["skipOverSet"];
					return insightFacade.addDataset("skipOverSet", content, InsightDatasetKind.Courses)
						.then((result: string[]) => {
							expect(result).to.deep.equal(expected);
						});
				});
			});

			context("Success: Add a Courses dataset while ignoring folders other than 'courses' in ZIP", () => {
				it("Should add a courses dataset with no error, ignoring other folders in the ZIP", () => {
					const content: string = datasetContents.get("ignoreFolderSet") ?? "";
					const expected: string[] = ["ignoreFolderSet"];
					return insightFacade.addDataset("ignoreFolderSet", content, InsightDatasetKind.Courses)
						.then((result: string[]) => {
							expect(result).to.deep.equal(expected);
						});
				});
			});

			context("Success: Add a Rooms dataset while ignoring folders other than 'rooms' in ZIP", () => {
				it("Should add a rooms dataset with no error, ignoring other folders in the ZIP", () => {
					const content: string = datasetContents.get("ignoreFolderRoomsSet") ?? "";
					const expected: string[] = ["ignoreFolderRoomsSet"];
					return insightFacade.addDataset("ignoreFolderRoomsSet", content, InsightDatasetKind.Rooms)
						.then((result: string[]) => {
							expect(result).to.deep.equal(expected);
						});
				});
			});

			context("Success: Add a Rooms dataset where some files linked in index.htm are missing", () => {
				it("Should add a rooms dataset with no error, with lesser number of rooms than a full dataset", () => {
					const content: string = datasetContents.get("missingBuildingFiles") ?? "";
					const expected: string[] = ["missingBuildingFiles"];
					return insightFacade.addDataset("missingBuildingFiles", content, InsightDatasetKind.Rooms)
						.then((result: string[]) => {
							expect(result).to.deep.equal(expected);
						});
				});
			});

			context("Fail: Add a dataset with an ID string that is an underscore '_'", () => {
				it("Should throw an InsightError on account of single underscore ID", () => {
					const content: string = datasetContents.get("courses1") ?? "";
					return insightFacade.addDataset("_", content, InsightDatasetKind.Courses)
						.then((result: string[]) => {
							fail();
						})
						.catch((error: any) => {
							expect(error).to.be.instanceOf(InsightError);
						});
				});
			});

			context("Fail: Add a dataset with an ID string containing an underscore", () => {
				it("Should throw an InsightError on account of the underscore contained in ID", () => {
					const content: string = datasetContents.get("courses1") ?? "";
					return insightFacade.addDataset("1_1", content, InsightDatasetKind.Courses)
						.then((result: string[]) => {
							fail();
						})
						.catch((error: any) => {
							expect(error).to.be.instanceOf(InsightError);
						});
				});
			});

			context("Fail: Add a dataset with an ID string as only 1 whitespace ' '", () => {
				it("Should throw an InsightError on account of only whitespace", () => {
					const content: string = datasetContents.get("courses1") ?? "";
					return insightFacade.addDataset(" ", content, InsightDatasetKind.Courses)
						.then((result: string[]) => {
							fail();
						})
						.catch((error: any) => {
							expect(error).to.be.instanceOf(InsightError);
						});
				});
			});

			context("Fail: Add a dataset with an ID string containing only whitespace", () => {
				it("Should throw an InsightError on account of more than one, but only whitespace", () => {
					const content: string = datasetContents.get("courses1") ?? "";
					return insightFacade.addDataset("   ", content, InsightDatasetKind.Courses)
						.then((result: string[]) => {
							fail();
						})
						.catch((error: any) => {
							expect(error).to.be.instanceOf(InsightError);
						});
				});
			});

			context("Fail: Add a dataset that is not in .ZIP format", () => {
				it("Should throw an InsightError on account of non-ZIP content file", () => {
					const pathString: string = "./test/resources/archives/invalidSetAsPic.png";
					const invalidDatasetFormat: string = fs.readFileSync(pathString).toString("base64");
					return insightFacade.addDataset("1", invalidDatasetFormat, InsightDatasetKind.Courses)
						.then((result: string[]) => {
							fail();
						})
						.catch((error: any) => {
							expect(error).to.be.instanceOf(InsightError);
						});
				});
			});

			context("Fail: Add a Courses dataset that does not have any valid course JSON", () => {
				it("Should throw an InsightError on account of invalid course JSON content", () => {
					const invalidDatasetJSON: string = datasetContents.get("invalidSetJSON") ?? "";
					return insightFacade.addDataset("1", invalidDatasetJSON, InsightDatasetKind.Courses)
						.then((result: string[]) => {
							fail();
						})
						.catch((error: any) => {
							expect(error).to.be.instanceOf(InsightError);
						});
				});
			});

			context("Fail: Add a Courses dataset that does not have a directory exactly named 'courses'", () => {
				it("Should throw an InsightError on account of a directory 'courses' not found", () => {
					const invalidDatasetDir: string = datasetContents.get("invalidSetDir") ?? "";
					return insightFacade.addDataset("1", invalidDatasetDir, InsightDatasetKind.Courses)
						.then((result: string[]) => {
							fail();
						})
						.catch((error: any) => {
							expect(error).to.be.instanceOf(InsightError);
						});
				});
			});

			context("Fail: Add a Rooms dataset that does not have a directory exactly named 'rooms'", () => {
				it("Should throw an InsightError on account of a directory 'rooms' not found", () => {
					// Give a courses dataset; will contain 'courses' but not 'rooms'
					const invalidRoomsDatasetDir: string = datasetContents.get("courses1") ?? "";
					return insightFacade.addDataset("1", invalidRoomsDatasetDir, InsightDatasetKind.Rooms)
						.then((result: string[]) => {
							fail();
						})
						.catch((error: any) => {
							expect(error).to.be.instanceOf(InsightError);
						});
				});
			});

			context("Fail: Add a dataset whose ID is already present in the database", () => {
				it("Should throw an InsightError for attempted duplicate ID", async () => {
					const content: string = datasetContents.get("courses1") ?? "";
					await insightFacade.addDataset("1", content, InsightDatasetKind.Courses);
					return insightFacade.addDataset("1", content, InsightDatasetKind.Courses)
						.then((result: string[]) => {
							fail();
						})
						.catch((error) => {
							expect(error).to.be.instanceOf(InsightError);
						});
				});
			});

			context("Fail: Add a dataset whose contents are empty (e.g. empty .ZIP)", () => {
				it("Should throw an InsightError as there are no valid sections present in dataset", () => {
					const emptyDataset: string = datasetContents.get("emptySet") ?? "";
					return insightFacade.addDataset("1", emptyDataset, InsightDatasetKind.Courses)
						.then((result: string[]) => {
							fail();
						})
						.catch((error: any) => {
							expect(error).to.be.instanceOf(InsightError);
						});
				});
			});

			context("Fail: Add a Rooms dataset that is missing an 'index.htm' file at the root directory", () => {
				it("Should throw an InsightError due to missing required index.htm file", () => {
					const missingIndex: string = datasetContents.get("missingIndex") ?? "";
					return insightFacade.addDataset("1", missingIndex, InsightDatasetKind.Rooms)
						.then((result: string[]) => {
							fail();
						})
						.catch((error: any) => {
							expect(error).to.be.instanceOf(InsightError);
						});
				});
			});
		});


		describe("InsightFacade.removeDataset Test Cases", function () {
			context("Success: Remove a dataset by matching ID", () => {
				it("Should take out a specified dataset by id value", async () => {
					const id: string = "courses1";
					const content: string = datasetContents.get("courses1") ?? "";
					const expected: string = id;
					await insightFacade.addDataset(id, content, InsightDatasetKind.Courses);
					return insightFacade.removeDataset(id)
						.then((result: string) => {
							expect(result).to.deep.equal(expected);
						});
				});
			});

			context("Success: Remove a dataset by matching ID, amongst other datasets", () => {
				it("Should take out a specified dataset without disturbing others", async () => {
					const id: string = "1";
					const id1: string = "2";
					const content: string = datasetContents.get("courses1") ?? "";
					await insightFacade.addDataset(id, content, InsightDatasetKind.Courses);
					await insightFacade.addDataset(id1, content, InsightDatasetKind.Courses);
					return insightFacade.removeDataset(id)
						.then((result: string) => {
							expect(result).to.deep.equal(id);
						});
				});
			});

			context("Fail: Remove a dataset whose ID does not exist in the database", () => {
				it("Should throw a NotFoundError for not finding specified dataset", () => {
					return insightFacade.removeDataset("1")
						.then((result: string) => {
							fail();
						})
						.catch((error: any) => {
							expect(error).to.be.instanceOf(NotFoundError);
						});
				});
			});

			context("Fail: Remove a dataset that existed, but was just removed previously", () => {
				it("Should throw a NotFoundError for not finding previously removed dataset", async () => {
					const id: string = "1";
					const content: string = datasetContents.get("courses1") ?? "";
					await insightFacade.addDataset(id, content, InsightDatasetKind.Courses);
					await insightFacade.removeDataset(id);
					return insightFacade.removeDataset(id)
						.then((result: string) => {
							fail();
						})
						.catch((error: any) => {
							expect(error).to.be.instanceOf(NotFoundError);
						});
				});
			});

			context("Fail: Attempt to remove dataset with invalid ID with underscore '_'", () => {
				it("Should throw an InsightError for underscore ID", () => {
					return insightFacade.removeDataset("_")
						.then((result: string) => {
							fail();
						})
						.catch((error: any) => {
							expect(error).to.be.instanceOf(InsightError);
						});
				});
			});

			context("Fail: Attempt to remove dataset with invalid ID containing underscore", () => {
				it("Should throw an InsightError for ID containing underscore", () => {
					return insightFacade.removeDataset("1_1")
						.then((result: string) => {
							fail();
						})
						.catch((error: any) => {
							expect(error).to.be.instanceOf(InsightError);
						});
				});
			});

			context("Fail: Attempt to remove dataset with invalid whitespace ID", () => {
				it("Should throw an InsightError for whitespace ID", () => {
					return insightFacade.removeDataset(" ")
						.then((result: string) => {
							fail();
						})
						.catch((error: any) => {
							expect(error).to.be.instanceOf(InsightError);
						});
				});
			});

			context("Fail: Attempt to remove dataset with invalid multi-whitespace ID", () => {
				it("Should throw an InsightError for multi-whitespace ID", () => {
					return insightFacade.removeDataset("   ")
						.then((result: string) => {
							fail();
						})
						.catch((error: any) => {
							expect(error).to.be.instanceOf(InsightError);
						});
				});
			});
		});


		describe("InsightFacade.listDataset Test Cases", function () {
			context("Success: Retrieve the list of datasets when empty", () => {
				it("Should return an empty list as no datasets are present or added", () => {
					return insightFacade.listDatasets()
						.then((result: any[]) => {
							expect(result).to.deep.equal([]);
							expect(result).to.have.length(0);
						});
				});
			});

			context("Success: Retrieve the list of datasets with only one dataset added", () => {
				it("Should return a list containing a single entry corresponding to the one dataset", async () => {
					const content: string = datasetContents.get("courses1") ?? "";
					await insightFacade.addDataset("1", content, InsightDatasetKind.Courses);
					const expected: InsightDataset = {
						id: "1",
						kind: InsightDatasetKind.Courses,
						numRows: 8
					};
					return insightFacade.listDatasets()
						.then((result: any[]) => {
							expect(result).to.have.deep.members([expected]);
							expect(result).to.have.length(1);
						});
				});
			});

			context("Success: Retrieve the list of datasets with multiple datasets added", () => {
				it("Should return a list containing more than a single entry", async () => {
					const content: string = datasetContents.get("courses1") ?? "";
					const roomContent: string = datasetContents.get("rooms") ?? "";
					await insightFacade.addDataset("1", content, InsightDatasetKind.Courses);
					await insightFacade.addDataset("2", content, InsightDatasetKind.Courses);
					await insightFacade.addDataset("3", roomContent, InsightDatasetKind.Rooms);

					const expected: InsightDataset = {
						id: "1",
						kind: InsightDatasetKind.Courses,
						numRows: 8
					};

					const expected1: InsightDataset = {
						id: "2",
						kind: InsightDatasetKind.Courses,
						numRows: 8
					};

					const expected2: InsightDataset = {
						id: "3",
						kind: InsightDatasetKind.Rooms,
						numRows: 364
					};

					return insightFacade.listDatasets()
						.then((result: any[]) => {
							expect(result).to.have.deep.members([expected, expected1, expected2]);
							expect(result).to.have.length(3);
						});
				});
			});
		});

		context("Success: Retrieve a Room dataset that was added with missing building files", () => {
			it("Should return a list with a numRows less than the full number of rooms", async () => {
				const content: string = datasetContents.get("missingBuildingFiles") ?? "";
				await insightFacade.addDataset("missingBuildingFiles", content, InsightDatasetKind.Rooms);

				const expected: InsightDataset = {
					id: "missingBuildingFiles",
					kind: InsightDatasetKind.Rooms,
					numRows: 61
				};

				return insightFacade.listDatasets()
					.then((result: any[]) => {
						expect(result).to.have.deep.members([expected]);
					});
			});
		});

		describe("InsightFacade Integration Tests", function () {
			context("Customer end-to-end interaction", () => {
				it("Success: Add and remove a dataset, with listDatasets reflecting changes", () => {
					const id: string = "courses";
					const content: string = datasetContents.get("courses") ?? "";
					const expected: string[] = [id];
					return insightFacade.addDataset(id, content, InsightDatasetKind.Courses)
						.then((result: string[]) => {
							expect(result).to.deep.equal(expected);
						})
						.then(() => {
							let newDataset: InsightDataset = {
								id: id, kind: InsightDatasetKind.Courses, numRows: 64612
							};
							const expectedDatasets1: InsightDataset[] = [newDataset];
							insightFacade.listDatasets().then((currSets: InsightDataset[]) => {
								expect(currSets).to.deep.equal(expectedDatasets1);
							});
						})
						.then(() => {
							insightFacade.removeDataset(id).then((removedID: string) => {
								expect(removedID).to.deep.equal(id);
							});
						})
						.then(() => {
							insightFacade.listDatasets().then((finalSetList: InsightDataset[]) => {
								expect(finalSetList).to.deep.equal([]);
							});
						});
				});
			});

			context("Persistent storage testing", () => {
				it("Success: Can instantiate other InsightFacade objects without loss of added data", () => {
					const id: string = "courses";
					const content: string = datasetContents.get("courses") ?? "";
					const expected: InsightDataset = {
						id: id,
						kind: InsightDatasetKind.Courses,
						numRows: 8
					};
					return insightFacade.addDataset(id, content, InsightDatasetKind.Courses)
						.then((result: string[]) => {
							expect(result).to.deep.equal([id]);
						})
						.then(() => {
							insightFacade.listDatasets().then((setList: InsightDataset[]) => {
								expect(setList).to.deep.equal([expected]);
							});
						})
						.then(() => {
							let insightFacade2: InsightFacade = new InsightFacade();
							insightFacade2.listDatasets().then((setList: InsightDataset[]) => {
								expect(setList).to.deep.equal([expected]);
							});
						});
				});
			});
		});
	});

	/*
	 * This test suite dynamically generates tests from the JSON files in test/queries.
	 * You should not need to modify it; instead, add additional files to the queries directory.
	 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
	 */
	describe("PerformQuery", () => {
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);

			insightFacade = new InsightFacade();

			// Load the datasets specified in datasetsToQuery and add them to InsightFacade.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises = [
				insightFacade.addDataset("courses", datasetContents.get("courses") ?? "", InsightDatasetKind.Courses),
				insightFacade.addDataset("courses1", datasetContents.get("courses1") ?? "", InsightDatasetKind.Courses),
				insightFacade.addDataset("courses2", datasetContents.get("courses2") ?? "", InsightDatasetKind.Courses),
				insightFacade.addDataset("rooms", datasetContents.get("rooms") ?? "", InsightDatasetKind.Rooms)
			];

			return Promise.all(loadDatasetPromises);
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
			fs.removeSync(persistDir);
		});

		type PQErrorKind = "ResultTooLargeError" | "InsightError";

		testFolder<any, any[], PQErrorKind>(
			"Dynamic InsightFacade PerformQuery tests",
			(input) => insightFacade.performQuery(input),
			"./test/resources/queries",
			{
				errorValidator(error): error is PQErrorKind {
					return error === "ResultTooLargeError" || error === "InsightError";
				},

				assertOnResult(expected: any[], actual: any, input: any) {
					expect(actual).to.be.instanceOf(Array);
					expect(actual).to.have.length(expected.length);
					expect(actual).to.have.deep.members(expected);

					const order: string | any = input.OPTIONS.ORDER;
					if (order !== undefined) {
						if (typeof order === "string") {
							for (let i = 1; i < actual.length; i++) {
								if (actual[i - 1][order] > actual[i][order]) {
									fail("Incorrect ordering");
								}
							}
						} else {
							let maxIdx: number = order.keys.length;
							if (order.dir === "DOWN") {
								for (let i = 1; i < actual.length; i++) {
									if (actual[i - 1][order.keys[0]] < actual[i][order.keys[0]]) {
										fail("Incorrect ordering");
									} else if (actual[i - 1][order.keys[0]] === actual[i][order.keys[0]]) {
										for (let j = 1; j < maxIdx; j++) {
											if (actual[i - 1][order.keys[j]] < actual[i][order.keys[j]]) {
												fail("Incorrect ordering");
											} else if (actual[i - 1][order.keys[j]] === actual[i][order.keys[j]]) {
												continue;
											} else {
												break;
											}
										}
									}
								}
							} else {
								for (let i = 1; i < actual.length; i++) {
									if (actual[i - 1][order.keys[0]] > actual[i][order.keys[0]]) {
										fail("Incorrect ordering");
									} else if (actual[i - 1][order.keys[0]] === actual[i][order.keys[0]]) {
										for (let j = 1; j < maxIdx; j++) {
											if (actual[i - 1][order.keys[j]] > actual[i][order.keys[j]]) {
												fail("Incorrect ordering");
											} else if (actual[i - 1][order.keys[j]] === actual[i][order.keys[j]]) {
												continue;
											} else {
												break;
											}
										}
									}
								}
							}
						}
					}
				},

				assertOnError(expected: PQErrorKind, actual: any) {
					if (expected === "ResultTooLargeError") {
						expect(actual).to.be.instanceof(ResultTooLargeError);
					} else {
						expect(actual).to.be.instanceof(InsightError);
					}
				}
			}
		);

		// UNCOMMENT FOR REGRESSION TESTING
		// testFolder<any, any[], PQErrorKind>(
		// 	"Dynamic InsightFacade PerformQuery Regression tests",
		// 	(input) => insightFacade.performQuery(input),
		// 	"./test/resources/regression",
		// 	{
		// 		errorValidator(error): error is PQErrorKind {
		// 			return error === "ResultTooLargeError" || error === "InsightError";
		// 		},
		//
		// 		assertOnResult(expected: any[], actual: any, input: any) {
		// 			expect(actual).to.be.instanceOf(Array);
		// 			expect(actual).to.have.length(expected.length);
		// 			expect(actual).to.have.deep.members(expected);
		//
		// 			const order: string | any = input.OPTIONS.ORDER;
		// 			if (order !== undefined) {
		// 				if (typeof order === "string") {
		// 					for (let i = 1; i < actual.length; i++) {
		// 						if (actual[i - 1][order] > actual[i][order]) {
		// 							fail("Incorrect ordering");
		// 						}
		// 					}
		// 				} else {
		// 					let maxIdx: number = order.keys.length;
		// 					if (order.dir === "DOWN") {
		// 						for (let i = 1; i < actual.length; i++) {
		// 							if (actual[i - 1][order.keys[0]] < actual[i][order.keys[0]]) {
		// 								fail("Incorrect ordering");
		// 							} else if (actual[i - 1][order.keys[0]] === actual[i][order.keys[0]]) {
		// 								for (let j = 1; j < maxIdx; j++) {
		// 									if (actual[i - 1][order.keys[j]] < actual[i][order.keys[j]]) {
		// 										fail("Incorrect ordering");
		// 									} else if (actual[i - 1][order.keys[j]] === actual[i][order.keys[j]]) {
		// 										continue;
		// 									} else {
		// 										break;
		// 									}
		// 								}
		// 							}
		// 						}
		// 					} else {
		// 						for (let i = 1; i < actual.length; i++) {
		// 							if (actual[i - 1][order.keys[0]] > actual[i][order.keys[0]]) {
		// 								fail("Incorrect ordering");
		// 							} else if (actual[i - 1][order.keys[0]] === actual[i][order.keys[0]]) {
		// 								for (let j = 1; j < maxIdx; j++) {
		// 									if (actual[i - 1][order.keys[j]] > actual[i][order.keys[j]]) {
		// 										fail("Incorrect ordering");
		// 									} else if (actual[i - 1][order.keys[j]] === actual[i][order.keys[j]]) {
		// 										continue;
		// 									} else {
		// 										break;
		// 									}
		// 								}
		// 							}
		// 						}
		// 					}
		// 				}
		// 			}
		// 		},
		//
		// 		assertOnError(expected: PQErrorKind, actual: any) {
		// 			if (expected === "ResultTooLargeError") {
		// 				expect(actual).to.be.instanceof(ResultTooLargeError);
		// 			} else {
		// 				expect(actual).to.be.instanceof(InsightError);
		// 			}
		// 		}
		// 	}
		// );
	});

	describe("Non-folder-test performQuery", function () {
		before(function () {
			fs.removeSync("./data/");
		});

		after(function () {
			fs.removeSync("./data/");
		});

		context("Success: Query returns exactly 5000 results", () => {
			it("Should successfully return exactly 5000 results", async () => {
				let id: string = "courses2";
				let content: string = datasetContents.get("courses2") ?? "";
				await new InsightFacade().addDataset(id, content, InsightDatasetKind.Courses);
				const query5000: string = "{ \"WHERE\": {},\"OPTIONS\":{\"COLUMNS\":[\"courses2_uuid\"]}}";
				return new InsightFacade().performQuery(JSON.parse(query5000))
					.then((result: any[]) => {
						expect(result).to.have.length(5000);
					});
			});
		});
	});
});
