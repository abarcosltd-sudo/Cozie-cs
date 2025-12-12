import { useEffect, useState } from "react";

function App() {
  const [data, setData] = useState(null);

  useEffect(() => {
    // Make request to your server
    fetch("https://cozie-ntlzuv990-abarcos-projects.vercel.app/api/home")
      .then((response) => response.json()) // parse JSON response
      .then((result) => {
        setData(result); // store result in state
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
      });
  }, []);

  return (
    <div>
      <h1>Server Response:</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

export default App;