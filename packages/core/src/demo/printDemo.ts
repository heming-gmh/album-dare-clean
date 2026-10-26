import { runDemoFixture } from "./runDemo.js";

function printBucket(title: string, ids: string[]): void {
  console.log(title);
  for (const id of ids) console.log(`  ${id}`);
}

const run = runDemoFixture();
console.log(run.mode);
printBucket("keep", run.scan.keep.map((row) => row.evidence.mediaId));
printBucket("uncertain", run.scan.uncertain.map((row) => row.evidence.mediaId));
printBucket("delete_cand", run.scan.deleteCand.map((row) => row.evidence.mediaId));
console.log(`restored ${run.restoredId}`);
