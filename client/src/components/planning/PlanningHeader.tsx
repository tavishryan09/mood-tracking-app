import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Title } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';

interface PlanningHeaderProps {
  weekTitle: string;
  onPrevious: () => void;
  onNext: () => void;
  headerBgColor: string;
  headerTextColor: string;
  iconColor: string;
  borderColor: string;
}

const PlanningHeader = React.memo(({
  weekTitle,
  onPrevious,
  onNext,
  headerBgColor,
  headerTextColor,
  iconColor,
  borderColor,
}: PlanningHeaderProps) => {
  return (
    <View style={[styles.header, { backgroundColor: headerBgColor, borderBottomColor: borderColor }]}>
      <View style={styles.headerNav}>
        <TouchableOpacity onPress={onPrevious} style={styles.navButton}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={28} color={iconColor} />
        </TouchableOpacity>
        <Title style={[styles.headerTitle, { color: headerTextColor }]}>{weekTitle}</Title>
        <TouchableOpacity onPress={onNext} style={styles.navButton}>
          <HugeiconsIcon icon={ArrowRight01Icon} size={28} color={iconColor} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

PlanningHeader.displayName = 'PlanningHeader';

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: 2,
    paddingVertical: 15,
  },
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  navButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default PlanningHeader;
