import { Calendar, FileUser, Headset, House } from "lucide-react";
import { Link } from "react-router-dom";
import React from "react";

const Sidebar = () => {
  return (
    <div className="fixed left-0 top-0 h-screen w-17 bg-base-300 flex flex-col justify-start items-center pt-[7rem]">
      <Link to={"/home"}>
        <button className="btn size-15 mb-[1rem] hover:bg-gradient-to-r from-blue-700 to-green-700">
          <House />
        </button>
      </Link>
      <Link to={"/realTs"}>
        <button className="btn size-15 mb-[1rem] hover:bg-gradient-to-r from-blue-700 to-green-700">
          <Headset />
        </button>
      </Link>
      <Link to={"/claims"}>
        <button className="btn size-15 mb-[1rem] hover:bg-gradient-to-r from-blue-700 to-green-700">
          <FileUser />
        </button>
      </Link>
      <Link to={"/calendar"}>
        <button className="btn size-15 mb-[1rem] hover:bg-gradient-to-r from-blue-700 to-green-700">
          <Calendar />
        </button>
      </Link>
    </div>
  );
};

export default Sidebar;
