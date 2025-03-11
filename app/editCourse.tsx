// EditCourse.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator, // Import ActivityIndicator
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getDatabase, ref, update, get } from 'firebase/database';
import { initializeApp } from 'firebase/app'; // If initializing here
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import app from './firebase';


const EditCourse: React.FC = () => {
  const [courseName, setCourseName] = useState('');
  const [classroomName, setClassroomName] = useState('');
  const [image, setImage] = useState<string | null>('default-course.jpg');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

    const { courseId } = useLocalSearchParams<{ courseId?: string }>();

  const auth = getAuth(app);
  const db = getDatabase(app);

    useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/'); // Redirect to login
      } else {
        if (!courseId) {
            Alert.alert("Error", "No course selected for editing!");
            router.back(); // or navigate to a default page
            return
        }
        // Fetch existing course data
        const courseRef = ref(db, `users/${user.uid}/classroom/${courseId}`);
        try{
            const snapshot = await get(courseRef);
            if (snapshot.exists()) {
              const courseData = snapshot.val();
              setCourseName(courseData.name || '');
              setClassroomName(courseData.classroom || '');
              if (courseData.image) {
                setImage(courseData.image);
              }
            } else {
               Alert.alert("Error", "Course not found.");
                router.back();
            }
        } catch (error:any){
            console.error("Error fetching course:", error);
            Alert.alert("Error", "Failed to load course data." + error.message)
        } finally {
            setLoading(false)
        }
      }
    });
    return () => unsubscribe();
  }, [auth, db, router, courseId]);



    const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
       setImage('data:image/jpeg;base64,' + result.assets[0].base64);

    }
  };


   const updateCourse = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "User not signed in.");
        return;
      }
      if(!courseId){
        Alert.alert("Error", "Course ID is missing")
        return
      }

      const courseRef = ref(db, `users/${user.uid}/classroom/${courseId}`);
      await update(courseRef, {
        name: courseName,
        classroom: classroomName,
        image: image || 'default-course.jpg', // Keep existing image if none selected
      });

      Alert.alert('Success', 'Course updated successfully!');
      router.replace('/dashboard');  // Go back to the previous screen
    } catch (error: any) {
      console.error('Error updating course:', error);
      Alert.alert('Error', `Error updating course: ${error.message}`);
    }
  };

    if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2CBFAE"/>
      </View>
    );
  }

  return (
   <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.h2}>Edit Course</Text>
        <Text style={styles.h3}>{courseName}</Text>

        <TextInput
          style={styles.input}
          placeholder="Course Name"
          value={courseName}
          onChangeText={setCourseName}
          placeholderTextColor="#9e9e9e"
        />

        <TextInput
          style={styles.input}
          placeholder="Classroom Name"
          value={classroomName}
          onChangeText={setClassroomName}
          placeholderTextColor="#9e9e9e"
        />

        <TouchableOpacity style={styles.fileInput} onPress={pickImage}>
          <Text style={styles.fileInputText}>Change Course Image</Text>
        </TouchableOpacity>

        <Image source={{ uri: image }} style={styles.previewImage} />

        <View style = {styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={updateCourse}>
              <Text style={styles.buttonText}>Save Changes</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => router.replace('/dashboard')}>
              <Text style={styles.buttonText}>Back to Dashboard</Text>
            </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
};
const styles = StyleSheet.create({
    container: {
        flexGrow: 1, // Use flexGrow with ScrollView
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E0E7E9',
        paddingTop: 50
    },
    formContainer: {
        backgroundColor: 'white',
        padding: 30,
        width: '90%', // Use percentages for responsiveness
        maxWidth: 500,   // Limit max width
        borderRadius: 8,
         shadowColor: '#000',  // Add shadow for better UI
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5, // For Android
        alignItems: 'center'
    },
    h2: {
        marginBottom: 10,
        color: '#354649',
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center'
    },
    h3: {
      color: '#354649',
      fontSize: 18,
      fontWeight: 'bold',
      textAlign: 'center', // Center h3 text
      marginBottom: 20, // Space below course name
  },
    input: {
        width: '100%',
        padding: 12,
        marginVertical: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        textAlign: 'center',
        fontSize: 16
    },
    button: {
        backgroundColor: '#2CBFAE',
         padding: 12,
        borderRadius: 5,
        marginTop: 10,
    },
    buttonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
       textAlign: 'center'
    },
    cancelButton: {
        backgroundColor: '#aaa', // Different color for cancel
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
        backgroundColor: 'white'
    },
     fileInputText: {
        color: '#2CBFAE',
        fontWeight: 'bold',
    },
    previewImage: {
        width: 150,
        height: 150,
        marginTop: 10,
        borderRadius: 8,
        resizeMode: 'cover', // Or 'contain', as needed
    },
    buttonContainer:{
      marginTop: 30,
      width: '100%'
    },
      loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default EditCourse;