import { initializeApp } from "firebase/app"
import { getDatabase } from "firebase/database"

const firebaseConfig = {
  apiKey: "AIzaSyCUXSRT4Xy9JzPpQLzpTwnUVVv7UC-fZYA",
  authDomain: "ordeasy-c247a.firebaseapp.com",
  databaseURL: "https://ordeasy-c247a-default-rtdb.firebaseio.com",
  projectId: "ordeasy-c247a",
  storageBucket: "ordeasy-c247a.firebasestorage.app",
  messagingSenderId: "33978423626",
  appId: "1:33978423626:web:1ac1f1c6941cd21191c9b3",
}

const app = initializeApp(firebaseConfig)
export const database = getDatabase(app)
export default app
