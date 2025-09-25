import { useState } from "react";
import axios from "axios";
import { IoMdAddCircle, IoMdCloseCircle } from "react-icons/io";
import api from "../../../backend/src/middleware/axiosSecure";
import { useParams } from "react-router-dom";
import "./css/createroom.css";
const CreateRoom = ({ onRoomCreated }) => {
  const { roomId } = useParams();
  const [showForm, setShowForm] = useState(false);
  const [roomData, setRoomData] = useState({
    name: "",
    image: "",
    description: "",
  });
  const [isReloading, setIsReloading] = useState(false);

  const handleChange = (e) => {
    setRoomData({ ...roomData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const createdBy = localStorage.getItem("userName") || "ไม่ระบุ";

    // เช็คชื่อห้องซ้ำ
    const res = await api.get(`/api/allrooms`);
    const allRooms = res.data;
    const isDuplicate = allRooms.some(
      (room) =>
        room.name.trim().toLowerCase() === roomData.name.trim().toLowerCase()
    );

    if (isDuplicate) {
      alert("มีห้องชื่อนี้อยู่แล้ว กรุณาตั้งชื่อใหม่");
      return;
    }

    try {
      const res = await api.post(`/api/createroom`, {
        ...roomData,
        createdBy,
        roomId,
      });
      onRoomCreated(res.data);
      setRoomData({ name: "", image: "", description: "" });
      setShowForm(false);
      setIsReloading(true); // 🔥 แสดง animation

      setTimeout(() => {
        window.location.reload();
      }, 1500); // ให้เวลา animation โชว์ก่อนรีโหลด
    } catch (err) {
      console.error("เกิดข้อผิดพลาดในการสร้างห้อง:", err);
    }
  };

  return (
    <div className="create-room-bt">
      <button className ="create-room-button" onClick={() => setShowForm(!showForm)}>
        {showForm ? <IoMdCloseCircle /> : <IoMdAddCircle />}
        {showForm ? "Cancel" : "Create Room"}
      </button>

      {showForm && (
        <div className="popup-overlay" onClick={() => setShowForm(false)}>
          <div className="popup-form" onClick={(e) => e.stopPropagation()}>
            <h3>Create Room</h3>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                className="commu-input"
                name="name"
                placeholder="ชื่อห้อง"
                value={roomData.name}
                onChange={handleChange}
                required
              />
              <input
                type="text"
                name="image"
                className="commu-input"
                placeholder="ลิงก์รูปภาพห้อง"
                value={roomData.image}
                onChange={handleChange}
              />

              {/* แสดง preview ถ้ามีลิงก์รูป */}
              {roomData.image && (
                <div className="image-preview">
                  <img src={roomData.image} alt="Preview" />
                </div>
              )}

              <textarea
                name="description"
                className="commu-input"
                placeholder="รายละเอียดเพิ่มเติม"
                value={roomData.description}
                onChange={handleChange}
              />
              <button type="submit">ยืนยันสร้างห้อง</button>
            </form>
          </div>
        </div>
      )}
      {isReloading && (
        <div className="reload-overlay">
          <div className="loader"></div>
          <p>Loading...</p>
        </div>
      )}
    </div>
  );
};

export default CreateRoom;
