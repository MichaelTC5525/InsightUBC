import {InsightDatasetKind, InsightError, ResultTooLargeError} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";

import * as fs from "fs-extra";

import {testFolder} from "@ubccpsc310/folder-test";
import {expect} from "chai";

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
		skipOverSet: "./test/resources/archives/skipOverSet.zip"
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
			context("Success: Add a dataset to a new database", () => {
				it("Should have a single dataset ID in the database", () => {
					const id: string = "courses1";
					const content: string = datasetContents.get("courses1") ?? "";
					const expected: string[] = [id];
					return insightFacade.addDataset(id, content, InsightDatasetKind.Courses)
						.then((result: string[]) => {
							expect(result).to.deep.equal(expected);
						});
				});
			});

			context("Success: Add a dataset to a database with one existing dataset", () => {
				it("Should have 2 dataset IDs in the database", async () => {
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

			context("Success: Add a dataset while skipping over an invalid file", () => {
				it("Should add a dataset with no error, with results from only valid files", () => {
					const content: string = datasetContents.get("skipOverSet") ?? "";
					const expected: string[] = ["skipOverSet"];
					return insightFacade.addDataset("skipOverSet", content, InsightDatasetKind.Courses)
						.then((result: string[]) => {
							expect(result).to.deep.equal(expected);
						});
				});
			});

			context("Success: Add a dataset while ignoring folders other than 'courses' in ZIP", () => {
				it("Should add a dataset with no error, ignoring other folders in the ZIP", () => {
					const content: string = datasetContents.get("ignoreFolderSet") ?? "";
					const expected: string[] = ["ignoreFolderSet"];
					return insightFacade.addDataset("ignoreFolderSet", content, InsightDatasetKind.Courses)
						.then((result: string[]) => {
							expect(result).to.deep.equal(expected);
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
							expect(result).to.deep.equal(id);
						});
				});
			});
		});

		describe("InsightFacade.listDataset Test Cases", function () {
			context("Success: Retrieve the list of datasets when empty", () => {
				it("Should return an empty list as no datasets are present or added", () => {
					return insightFacade.listDatasets()
						.then((result: any[]) => {
							expect(result).to.have.length(0);
							expect(result).to.deep.equal([]);
						});
				});
			});

			context("Success: Retrieve the list of datasets with only one dataset added", () => {
				it("Should return a list containing a single entry corresponding to the one dataset", async () => {
					const content: string = datasetContents.get("courses1") ?? "";
					await insightFacade.addDataset("1", content, InsightDatasetKind.Courses);
					return insightFacade.listDatasets()
						.then((result: any[]) => {
							expect(result).to.have.length(1);
						});
				});
			});

			context("Success: Retrieve the list of datasets with multiple datasets added", () => {
				it("Should return a list containing more than a single entry", async () => {
					const content: string = datasetContents.get("courses1") ?? "";
					await insightFacade.addDataset("1", content, InsightDatasetKind.Courses);
					await insightFacade.addDataset("2", content, InsightDatasetKind.Courses);
					return insightFacade.listDatasets()
						.then((result: any[]) => {
							expect(result).to.have.length(2);
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
				errorValidator: (error): error is PQErrorKind =>
					error === "ResultTooLargeError" || error === "InsightError",
				assertOnError(expected, actual) {
					if (expected === "ResultTooLargeError") {
						expect(actual).to.be.instanceof(ResultTooLargeError);
					} else {
						expect(actual).to.be.instanceof(InsightError);
					}
				},
			}
		);
	});
});
