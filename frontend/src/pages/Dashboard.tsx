import React, {useState, useEffect} from 'react';
import { getMe } from "../api/auth";

const Dashboard: React.FC = () => {
    const [me, setMe] = useState<{ email: string; name: string } | null>(null);

  useEffect(() => {
    getMe().then((data) => {
      if (data) setMe(data);
    });
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Home</h2>
      {me ? (
        <p>
          Logged in as <b>{me.name}</b> ({me.email})
        </p>
      ) : (
        <p>Not logged in.</p>
      )}
      <button
        onClick={() => {
          localStorage.removeItem("access_token");
          window.location.reload();
        }}
      >
        Logout
      </button>
    </div>
  );
};

export default Dashboard;