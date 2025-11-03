import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Title, List, RadioButton } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { StopWatchIcon } from '@hugeicons/core-free-icons';
import { timeEntriesAPI, projectsAPI } from '../../services/api';

const StartTimerScreen = ({ navigation }: any) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      // Add timeout to prevent infinite loading
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 800)
      );

      const response = await Promise.race([projectsAPI.getAll(), timeout]) as any;
      const activeProjects = response.data.filter((p: any) => p.status === 'ACTIVE');
      setProjects(activeProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
      // Set empty projects so UI still loads
      setProjects([]);
    }
  };

  const handleStartTimer = async () => {
    if (!selectedProject) {
      Alert.alert('Error', 'Please select a project');
      return;
    }

    setLoading(true);
    try {
      await timeEntriesAPI.create({
        projectId: selectedProject,
        description,
        startTime: new Date().toISOString(),
        isManualEntry: false,
      });

      Alert.alert('Success', 'Timer started!');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to start timer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Title>Start Timer</Title>

        <Title style={styles.sectionTitle}>Select Project *</Title>
        <RadioButton.Group onValueChange={setSelectedProject} value={selectedProject}>
          {projects.length === 0 ? (
            <List.Item
              title="No active projects found"
              description="Create a project first"
              left={(props) => <List.Icon {...props} icon="alert-circle" />}
            />
          ) : (
            projects.map((project) => (
              <List.Item
                key={project.id}
                title={project.name}
                description={project.client?.name}
                left={(props) => (
                  <RadioButton.Android {...props} value={project.id} status={selectedProject === project.id ? 'checked' : 'unchecked'} />
                )}
                onPress={() => setSelectedProject(project.id)}
              />
            ))
          )}
        </RadioButton.Group>

        <TextInput
          label="Description (Optional)"
          value={description}
          onChangeText={setDescription}
          mode="outlined"
          multiline
          numberOfLines={3}
          style={styles.input}
          placeholder="What are you working on?"
        />

        <Button
          mode="contained"
          onPress={handleStartTimer}
          loading={loading}
          disabled={loading || !selectedProject}
          style={styles.button}
          icon={() => <HugeiconsIcon icon={StopWatchIcon} size={18} color="#fff" />}
        >
          Start Timer
        </Button>

        <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.button}>
          Cancel
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    marginTop: 15,
    marginBottom: 10,
  },
  input: {
    marginTop: 15,
    marginBottom: 15,
  },
  button: {
    marginTop: 10,
  },
});

export default StartTimerScreen;
