// EditProfile.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { getAuth, updateProfile, signOut, onAuthStateChanged } from 'firebase/auth';
import { getDatabase, ref, update, get } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { initializeApp } from 'firebase/app';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';


const EditProfile: React.FC = () => {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [photo, setPhoto] = useState<string | null>('default-profile.jpg'); // Use string for image URI
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // Keep track of selected file
  const [loading, setLoading] = useState(true);

    const router = useRouter();

  const firebaseConfig = {
    apiKey: "AIzaSyARzaE-mGJkYl9aD4LffYo-FW7FYRpUXD4",
    authDomain: "classroom-9e811.firebaseapp.com",
    databaseURL: "https://classroom-9e811-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "classroom-9e811",
    storageBucket: "classroom-9e811.firebasestorage.app",
    messagingSenderId: "543633744426",
    appId: "1:543633744426:web:98c2cc2f2846dfc31dd953",
    measurementId: "G-GFC2LZF52Q"
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getDatabase(app);
  const storage = getStorage(app);

  useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (user) {
              // Fetch user data and update state
              const userRef = ref(db, 'users/' + user.uid);
              try {
                  const snapshot = await get(userRef);
                  if (snapshot.exists()) {
                      const userData = snapshot.val();
                      setDisplayName(userData.name || user.displayName || "");
                      setUsername(userData.username || "user123");
                      setEmail(user.email || "");
                      setPhoto(userData.photo || user.photoURL || 'default-profile.jpg'); // Prioritize database photo
                  }
              } catch (error) {
                  console.error("Error fetching user data:", error);
              } finally {
                  setLoading(false); // Set loading to false after data fetch (success or error)
              }
          } else {
             router.replace('/'); // Redirect to login
          }
      });
      return () => unsubscribe(); // Cleanup listener
  }, [auth, db, router]);


  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      // Convert the selected asset to a Blob, *then* set it as the selectedFile
        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();
        setSelectedFile(blob as File);  // Cast to File

        // *Also* update the `photo` state for the preview
        setPhoto(result.assets[0].uri);
    }
  };


  const updateUserProfileData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "User not signed in.");
        return;
      }

      let photoURL = null;

      if (selectedFile) {
        const storageRefPath = storageRef(storage, `profile_images/${user.uid}/${selectedFile.name}`);
        const snapshot = await uploadBytes(storageRefPath, selectedFile);
        photoURL = await getDownloadURL(snapshot.ref);
        //Update auth
         await updateProfile(user, { displayName: displayName, photoURL: photoURL });
      }

        //Update database
      const userRef = ref(db, 'users/' + user.uid);
      await update(userRef, {
        name: displayName,
        email: email, // Email should generally not be updated here; it's a credential.
        photo: photoURL || photo,  // Use new URL if uploaded, otherwise existing
        username: username
      });

      Alert.alert("Success", "Profile updated successfully!");
        router.replace('/dashboard'); // Navigate to dashboard
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert("Error", `Error updating profile: ${error.message}`);
    }
  };

    const handleLogout = async () => {
    try {
      await signOut(auth);
        router.replace('/'); // Redirect to your login/signup route
    } catch (error: any) {
      console.error("Logout error:", error);
      Alert.alert("Error", "Failed to log out.");
    }
  };

    if (loading) {
        return (
            <View style={styles.container}>
                <Text>Loading...</Text>
            </View>
        );
    }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.profileContainer}>
        <Image source={{ uri: photo || 'default-profile.jpg' }} style={styles.profileImage} />
        <Text style={styles.displayName}>{displayName}</Text>
        <Text style={styles.username}>@{username}</Text>

        <TouchableOpacity style={styles.fileInput} onPress={pickImage}>
            <Text style={styles.fileInputText}>Choose Profile Picture</Text>
        </TouchableOpacity>


        <TextInput
          style={styles.input}
          placeholder="Username"
          value={displayName}
          onChangeText={setDisplayName}
          placeholderTextColor="#9e9e9e"
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          editable={false}  // Prevent email editing
          placeholderTextColor="#9e9e9e"

        />
        <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={updateUserProfileData}>
                <Text style={styles.buttonText}>Save Changes</Text>
            </TouchableOpacity>
        </View>

      </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0E7E9',
    paddingTop: 50, // Adjust if you have a header/tabs
  },
  profileContainer: {
    backgroundColor: 'white',
    padding: 30,
    width: '90%', // Responsive width
    maxWidth: 500,
    alignItems: 'center',
    borderRadius: 8,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60, // Half of width/height for a circle
    borderWidth: 3,
    borderColor: '#2CBFAE',
    objectFit: 'cover',
    marginBottom: 10,
  },
  displayName: {
    marginBottom: 10,
    color: '#354649',
    fontSize: 24,
    fontWeight: 'bold',
  },
  username: {
    marginBottom: 20,
    color: '#666', // Lighter color for the username
    fontSize: 16,
  },
  input: {
    width: '100%',
    padding: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    textAlign: 'center',
    fontSize: 16,
  },
    button: {
    backgroundColor: '#2CBFAE',
    padding: 15, // Make button larger
    borderRadius: 8,
    width: '100%', // Full width within its container
  },
  buttonText: {
      color: 'white',
      textAlign: 'center',
      fontSize: 18,
      fontWeight: 'bold'
  },
   fileInput: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 250,
    marginVertical: 10,
    borderWidth: 2,
    borderColor: '#2CBFAE',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 10,
    backgroundColor: 'white',
  },
    fileInputText: {
    color: '#2CBFAE',
    fontWeight: 'bold',
  },
    buttonContainer:{
    marginTop: 30,
    width: '100%'
  },
   logoutButton: {
        marginTop: 20,
        backgroundColor: '#f44336', // Example red color for logout
        padding: 10,
        borderRadius: 5,
    },
    logoutButtonText: {
        color: 'white',
        textAlign: 'center',
        fontSize:16
    },
});

export default EditProfile;