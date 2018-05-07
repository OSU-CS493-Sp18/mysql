function waitAndPrint(message, callback) {
  // setTimeout(function () {});
  setTimeout(() => {
    if (message === "Error") {
      callback(`We didn't like this message: "${message}"`);
    } else {
      console.log(message);
      callback(null);
    }
  }, 1000);
}

// waitAndPrint("3", (err1) => {
//   if (err1) {
//     console.log("== Error:", err1);
//   } else {
//     waitAndPrint("2", (err2) => {
//       if (err2) {
//         console.log("== Error:", err2);
//       } else {
//         waitAndPrint("1", (err3) => {
//           if (err3) {
//             console.log("== Error:", err3);
//           }
//         });
//       }
//     });
//   }
// });

// let p = new Promise((resolve, reject) => {
//   doAsyncOperation((err, results) => {
//     if (err) {
//       reject(err);
//     } else {
//       resolve(resolve);
//     }
//   });
// });

function waitAndPrintWithPromises(message) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (message === "Error") {
        reject(`We didn't like this message: "${message}"`);
      } else {
        console.log(message);
        resolve();
      }
    }, 1000);
  });
}

waitAndPrintWithPromises("3")
  .then(() => { return waitAndPrintWithPromises("2"); })
  .then(() => { return waitAndPrintWithPromises("Error"); })
  // .catch((err) => { console.log("== Error (different):", err); })
  .then(() => { return waitAndPrintWithPromises("... Blastoff!"); })
  .catch((err) => { console.log("== Error:", err); });
console.log("ok");
