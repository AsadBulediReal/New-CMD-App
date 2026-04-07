import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import { Button } from "./components/ui/button";
import { Routes, Route } from "react-router";
import UploadeFile from "./Pages/UploadeFile";

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <div className="App">
              <div>
                <a href="https://vitejs.dev" target="_blank">
                  <img src={viteLogo} className="logo" alt="Vite logo" />
                </a>
                <a href="https://react.dev" target="_blank">
                  <img
                    src={reactLogo}
                    className="logo react"
                    alt="React logo"
                  />
                </a>
              </div>
              <h1>Vite + React</h1>
              <div className="card">
                <Button onClick={() => setCount((count) => count + 1)}>
                  count is {count}
                </Button>
              </div>
              <p>
                Edit <code>src/App.tsx</code> and save to test HMR
              </p>
              <p>
                <a href="https://react.dev/learn" target="_blank">
                  Learn React
                </a>
              </p>
            </div>
          }
        />
        <Route path="/upload" element={<UploadeFile />} />
        <Route path="/about" element={<div>About Page</div>} />
      </Routes>
    </>
  );
}

export default App;
