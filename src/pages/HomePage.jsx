import { React, useState } from "react";
const HomePage = () => {
  const [files, setFiles] = useState({
    doc1: null,
    doc2: null,
    description: "",
  });

  const handleFileChange = (event, field) => {
    setFiles((prev) => ({ ...prev, [field]: event.target.files[0] }));
  };

  const handleDescriptionChange = (event) => {
    setFiles((prev) => ({ ...prev, description: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    console.log("Uploaded Files:", files);
  };
  return (
    <div className="flex items-center justify-center h-screen bg-transparent p-4">
      <div className="flex flex-col md:flex-row container w-full max-w-7xl justify-center items-center gap-8">
        <div className="glass-card w-full max-w-2xl flex flex-col p-8">
          <form className="w-full h-full space-y-6" onSubmit={handleSubmit}>
            <h2 className="text-white text-3xl font-extrabold mb-6">
              Upload Your Claim Documents
            </h2>

            {/* Document 1 */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Document 1</label>
              <input
                type="file"
                onChange={(e) => handleFileChange(e, "doc1")}
                className="input-dark w-full"
              />
            </div>

            {/* Document 2 */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Document 2</label>
              <input
                type="file"
                onChange={(e) => handleFileChange(e, "doc2")}
                className="input-dark w-full"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Description</label>
              <textarea
                rows="4"
                value={files.description}
                onChange={handleDescriptionChange}
                className="input-dark w-full resize-none"
                placeholder="Enter description..."
              ></textarea>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full btn-pill-primary py-3.5 rounded-xl font-bold mt-4"
            >
              Submit Documents
            </button>
          </form>
        </div>
        <div className="glass-card w-full max-w-md h-[400px] flex items-center justify-center p-8 hidden md:flex">
           <p className="text-gray-400 font-medium">Additional Information / Preview</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
