export interface User {
  email: string;
  name: string;
  role: 'hq_admin' | 'warehouse_head';
  warehouse_scope?: number | null;
}

export interface ZoneMetadata {
  zone_id: number;
  commodity_type: string;
  capacity_sacks: number;
}

export interface Warehouse {
  warehouse_id: number;
  name: string;
  district: string;
  latitude: number;
  longitude: number;
  zones: ZoneMetadata[];
  current_occupancy_pct?: number | null;
  latest_status?: string | null;
}

export interface SensorReading {
  Timestamp: string;
  Warehouse_ID: number;
  Warehouse_Name: string;
  District: string;
  Latitude: number;
  Longitude: number;
  Zone_ID: number;
  Commodity_Type: string;
  Distance_cm: number;
  Temperature_C: number;
  'Humidity_%': number;
  Smoke_ppm: number;
  Motion: number;
  Number_of_Sacks: number;
  Avg_Weight_per_Sack_kg: number;
  Total_Weight_kg: number;
  Zone_Capacity_Sacks: number;
  Occupancy_Pct: number;
  Vacant_Space_Pct: number;
  Rack_Status: string;
  Temp_Status: string;
  Smoke_Status: string;
  Warehouse_Status: string;
  Month: number;
  Year: number;
  Previous_Year_Avg_Fill_Pct: number;
  Previous_Year_Days_RackFull: number;
  Next_Year_Projected_Occupancy_Pct: number;
}

export interface PaginatedReadings {
  total: number;
  page: number;
  limit: number;
  readings: SensorReading[];
}

export interface FeatureImportance {
  feature: string;
  value: number;
  importance: number;
}

export interface PredictStatusResponse {
  status: string;
  confidence: number;
  top_features: FeatureImportance[];
  class_probabilities?: Record<string, number>;
  engineered_features?: {
    Thermal_Moisture_Index: number;
    Combustion_Risk_Score: number;
    Capacity_Pressure_Index: number;
  };
}

export interface PredictYearlyResponse {
  warehouse_id?: number | null;
  projected_occupancy_pct: number;
  confidence_interval: {
    lower_bound: number;
    upper_bound: number;
  };
}

export interface Alert {
  id: string;
  warehouse_id: number;
  warehouse_name: string;
  zone_id: number;
  severity: string;
  status: string;
  message: string;
  narration: string;
  created_at: string;
  acknowledged: boolean;
  acknowledged_by?: string | null;
  acknowledged_at?: string | null;
}

export interface AnalyticsOverview {
  total_warehouses: number;
  total_capacity_sacks: number;
  current_stored_sacks: number;
  vacant_space_sacks: number;
  overall_occupancy_pct: number;
  status_distribution: Record<string, number>;
}

export interface ModelMetrics {
  classifier: {
    accuracy: number;
    macro_f1: number;
    smote_applied: boolean;
    class_metrics: Record<string, { precision: number; recall: number; f1: number }>;
    confusion_matrix: number[][];
    classes: string[];
    features: string[];
    feature_importances: number[];
  };
  forecaster: {
    mae: number;
    r2: number;
    forecaster_sample_size: number;
    forecaster_note: string;
    features: string[];
    coefficients: number[];
    intercept: number;
  };
  last_trained: string;
}

export interface ChatMessage {
  role: string;
  content: string;
}

export interface ChatResponse {
  response: string;
  grounded_context?: Record<string, any> | null;
  latency_ms: number;
  model_used: string;
}
