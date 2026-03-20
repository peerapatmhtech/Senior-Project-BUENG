// Friend.js
import mongoose from 'mongoose';

const FriendSchema = new mongoose.Schema(
  {
    email: String,
    // เปลี่ยน friends เป็น array ของ object เพื่อเก็บ roomId ด้วย
    friends: [
      {
        email: String,
        roomId: String,
        eventId: String, // เพิ่ม eventId เพื่อเชื่อมโยงกิจกรรม
      },
    ],
    following: { type: [String], default: [] },
    followers: { type: [String], default: [] },
  },
  { timestamps: true }
);

// addFriend: เพิ่มเพื่อน (รองรับ roomId และ eventId)
FriendSchema.statics.addFriend = async function (userEmail, friendEmail, roomId, eventId = null) {
  let user = await this.findOne({ email: userEmail });
  if (!user) {
    user = new this({
      email: userEmail,
      friends: [{ email: friendEmail, roomId, eventId }],
    });
  } else {
    // ตรวจสอบทั้ง email และ roomId เพื่อไม่ให้ห้องซ้ำซ้อน 
    // หรือถ้าเป็นเพื่อนกันอยู่แล้ว แต่มาจากกิจกรรมใหม่ (eventId ใหม่) อาจจะต้องการ อัปเดต?
    // แต่ตามความต้องการคือ Source of Truth เดียว 
    const isAlreadyFriend = user.friends.some((f) => f.email === friendEmail);
    if (!isAlreadyFriend) {
      user.friends.push({ email: friendEmail, roomId, eventId });
    } else {
      // หากเป็นเพื่อนกันอยู่แล้ว แต่อาจต้องการอัปเดต roomId หรือ eventId ล่าสุด
      const friendIdx = user.friends.findIndex(f => f.email === friendEmail);
      if (friendIdx !== -1) {
        if (roomId) user.friends[friendIdx].roomId = roomId;
        if (eventId) user.friends[friendIdx].eventId = eventId;
      }
    }
  }
  await user.save();
  return user;
};

// removeFriend: ลบเพื่อน (ลบด้วย email)
FriendSchema.statics.removeFriend = async function (userEmail, friendEmail) {
  const user = await this.findOne({ email: userEmail });
  if (!user) throw new Error('User not found');
  user.friends = user.friends.filter((f) => f.email !== friendEmail);
  await user.save();
  return user;
};

// ✅ เพิ่ม getAllUsers ตรงนี้
FriendSchema.statics.getAllUsers = function () {
  return this.find(); // ดึง users ทั้งหมดใน collection 'friends'
};

export const Friend = mongoose.model('Friend', FriendSchema);
export default Friend;
