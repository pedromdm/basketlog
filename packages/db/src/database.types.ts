
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "competition_groups": {
                  Row: {
                    "id": string,"name": string,"phase_id": string,"position": number
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"name": string,"phase_id": string,"position": number
                  }
                  Update: {
                    "id"?: string,"name"?: string,"phase_id"?: string,"position"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "competition_groups_phase_id_fkey"
      columns: ["phase_id"]
isOneToOne: false
      referencedRelation: "competition_phases"
      referencedColumns: ["id"]
    }
                  ]
                },"competition_phases": {
                  Row: {
                    "competition_id": string,"id": string,"name": string,"position": number
                  }
                  ComputedFields: never
                  Insert: {
                    "competition_id": string,"id"?: string,"name": string,"position": number
                  }
                  Update: {
                    "competition_id"?: string,"id"?: string,"name"?: string,"position"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "competition_phases_competition_id_fkey"
      columns: ["competition_id"]
isOneToOne: false
      referencedRelation: "competitions"
      referencedColumns: ["id"]
    }
                  ]
                },"competition_rounds": {
                  Row: {
                    "id": string,"name": string,"phase_id": string,"position": number
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"name": string,"phase_id": string,"position": number
                  }
                  Update: {
                    "id"?: string,"name"?: string,"phase_id"?: string,"position"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "competition_rounds_phase_id_fkey"
      columns: ["phase_id"]
isOneToOne: false
      referencedRelation: "competition_phases"
      referencedColumns: ["id"]
    }
                  ]
                },"competition_teams": {
                  Row: {
                    "competition_id": string,"team_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "competition_id": string,"team_id": string
                  }
                  Update: {
                    "competition_id"?: string,"team_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "competition_teams_competition_id_fkey"
      columns: ["competition_id"]
isOneToOne: false
      referencedRelation: "competitions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "competition_teams_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    }
                  ]
                },"competitions": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"name": string,"season": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"name": string,"season"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"name"?: string,"season"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"game_events": {
                  Row: {
                    "clock_ms": number,"created_at": string,"created_by": string,"device_seq": number,"game_id": string,"group_id": string,"id": string,"payload": NonNullable<Json>,"period": number,"player_id": string | null,"server_seq": number,"side": Database["public"]['Enums']["side"],"type": Database["public"]['Enums']["event_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "clock_ms": number,"created_at"?: string,"created_by": string,"device_seq": number,"game_id": string,"group_id": string,"id": string,"payload"?: NonNullable<Json>,"period": number,"player_id"?: string | null,"server_seq"?: never,"side": Database["public"]['Enums']["side"],"type": Database["public"]['Enums']["event_type"]
                  }
                  Update: {
                    "clock_ms"?: number,"created_at"?: string,"created_by"?: string,"device_seq"?: number,"game_id"?: string,"group_id"?: string,"id"?: string,"payload"?: NonNullable<Json>,"period"?: number,"player_id"?: string | null,"server_seq"?: never,"side"?: Database["public"]['Enums']["side"],"type"?: Database["public"]['Enums']["event_type"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_events_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_events_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "players"
      referencedColumns: ["id"]
    }
                  ]
                },"game_rosters": {
                  Row: {
                    "display_name": string,"game_id": string,"number": number,"player_id": string,"side": Database["public"]['Enums']["side"],"starter": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "display_name": string,"game_id": string,"number": number,"player_id": string,"side": Database["public"]['Enums']["side"],"starter"?: boolean
                  }
                  Update: {
                    "display_name"?: string,"game_id"?: string,"number"?: number,"player_id"?: string,"side"?: Database["public"]['Enums']["side"],"starter"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_rosters_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_rosters_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "players"
      referencedColumns: ["id"]
    }
                  ]
                },"game_scorekeepers": {
                  Row: {
                    "game_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "game_id": string,"user_id": string
                  }
                  Update: {
                    "game_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_scorekeepers_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    }
                  ]
                },"games": {
                  Row: {
                    "away_team_id": string,"away_tracking": Database["public"]['Enums']["tracking_mode"],"competition": string | null,"competition_id": string | null,"created_at": string,"created_by": string | null,"group_id": string | null,"home_team_id": string,"home_tracking": Database["public"]['Enums']["tracking_mode"],"id": string,"is_public": boolean,"league_id": string | null,"round_id": string | null,"rules": NonNullable<Json>,"starts_at": string | null,"status": Database["public"]['Enums']["game_status"],"venue": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "away_team_id": string,"away_tracking"?: Database["public"]['Enums']["tracking_mode"],"competition"?: string | null,"competition_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"group_id"?: string | null,"home_team_id": string,"home_tracking"?: Database["public"]['Enums']["tracking_mode"],"id"?: string,"is_public"?: boolean,"league_id"?: string | null,"round_id"?: string | null,"rules": NonNullable<Json>,"starts_at"?: string | null,"status"?: Database["public"]['Enums']["game_status"],"venue"?: string | null
                  }
                  Update: {
                    "away_team_id"?: string,"away_tracking"?: Database["public"]['Enums']["tracking_mode"],"competition"?: string | null,"competition_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"group_id"?: string | null,"home_team_id"?: string,"home_tracking"?: Database["public"]['Enums']["tracking_mode"],"id"?: string,"is_public"?: boolean,"league_id"?: string | null,"round_id"?: string | null,"rules"?: NonNullable<Json>,"starts_at"?: string | null,"status"?: Database["public"]['Enums']["game_status"],"venue"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "games_away_team_id_fkey"
      columns: ["away_team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "games_competition_id_fkey"
      columns: ["competition_id"]
isOneToOne: false
      referencedRelation: "competitions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "games_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "competition_groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "games_home_team_id_fkey"
      columns: ["home_team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "games_league_id_fkey"
      columns: ["league_id"]
isOneToOne: false
      referencedRelation: "leagues"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "games_round_id_fkey"
      columns: ["round_id"]
isOneToOne: false
      referencedRelation: "competition_rounds"
      referencedColumns: ["id"]
    }
                  ]
                },"group_assignments": {
                  Row: {
                    "group_id": string,"round_id": string,"team_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "group_id": string,"round_id": string,"team_id": string
                  }
                  Update: {
                    "group_id"?: string,"round_id"?: string,"team_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "group_assignments_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "competition_groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "group_assignments_round_id_fkey"
      columns: ["round_id"]
isOneToOne: false
      referencedRelation: "competition_rounds"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "group_assignments_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    }
                  ]
                },"leagues": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"name": string,"season": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"name": string,"season": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"name"?: string,"season"?: string
                  }
                  Relationships: [
                    
                  ]
                },"memberships": {
                  Row: {
                    "created_at": string,"id": string,"league_id": string | null,"role": Database["public"]['Enums']["member_role"],"team_id": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"league_id"?: string | null,"role": Database["public"]['Enums']["member_role"],"team_id"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"league_id"?: string | null,"role"?: Database["public"]['Enums']["member_role"],"team_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "memberships_league_id_fkey"
      columns: ["league_id"]
isOneToOne: false
      referencedRelation: "leagues"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "memberships_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    }
                  ]
                },"notified_events": {
                  Row: {
                    "created_at": string,"game_id": string,"kind": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"game_id": string,"kind": string
                  }
                  Update: {
                    "created_at"?: string,"game_id"?: string,"kind"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notified_events_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    }
                  ]
                },"players": {
                  Row: {
                    "active": boolean,"created_at": string,"display_name": string,"first_name": string,"id": string,"last_name": string,"number": number,"photo_url": string | null,"position": Database["public"]['Enums']["position"] | null,"team_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"display_name": string,"first_name": string,"id"?: string,"last_name": string,"number": number,"photo_url"?: string | null,"position"?: Database["public"]['Enums']["position"] | null,"team_id": string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"display_name"?: string,"first_name"?: string,"id"?: string,"last_name"?: string,"number"?: number,"photo_url"?: string | null,"position"?: Database["public"]['Enums']["position"] | null,"team_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "players_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    }
                  ]
                },"push_tokens": {
                  Row: {
                    "created_at": string,"id": string,"platform": string,"token": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"platform": string,"token": string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"platform"?: string,"token"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"rule_presets": {
                  Row: {
                    "id": string,"name": string,"rules": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"name": string,"rules": NonNullable<Json>
                  }
                  Update: {
                    "id"?: string,"name"?: string,"rules"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"team_follows": {
                  Row: {
                    "created_at": string,"team_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"team_id": string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"team_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "team_follows_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    }
                  ]
                },"teams": {
                  Row: {
                    "abbr": string,"city": string | null,"color_primary": string,"created_at": string,"created_by": string | null,"id": string,"league_id": string | null,"logo_url": string | null,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "abbr": string,"city"?: string | null,"color_primary"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"league_id"?: string | null,"logo_url"?: string | null,"name": string
                  }
                  Update: {
                    "abbr"?: string,"city"?: string | null,"color_primary"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"league_id"?: string | null,"logo_url"?: string | null,"name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "teams_league_id_fkey"
      columns: ["league_id"]
isOneToOne: false
      referencedRelation: "leagues"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "assign_scorekeeper":
{ Args: { "p_email": string,"p_game_id": string }; Returns: string
                           },
"can_manage_competition":
{ Args: { "p_competition_id": string }; Returns: boolean
                           },
"can_manage_game":
{ Args: { "p_game_id": string }; Returns: boolean
                           },
"can_view_game":
{ Args: { "p_game_id": string }; Returns: boolean
                           },
"competition_of_phase":
{ Args: { "p_phase_id": string }; Returns: string
                           },
"competition_of_round":
{ Args: { "p_round_id": string }; Returns: string
                           },
"create_game":
{ Args: { "p_away_starters"?: (string)[],"p_away_team_id": string,"p_away_tracking"?: Database["public"]['Enums']["tracking_mode"],"p_competition"?: string,"p_competition_id"?: string,"p_group_id"?: string,"p_home_starters"?: (string)[],"p_home_team_id": string,"p_home_tracking"?: Database["public"]['Enums']["tracking_mode"],"p_round_id"?: string,"p_rules": Json,"p_starts_at"?: string,"p_status"?: Database["public"]['Enums']["game_status"],"p_venue"?: string }; Returns: string
                           },
"is_game_open":
{ Args: { "p_game_id": string }; Returns: boolean
                           },
"is_game_scorekeeper":
{ Args: { "p_game_id": string }; Returns: boolean
                           },
"is_league_admin":
{ Args: { "p_league_id": string }; Returns: boolean
                           },
"is_team_admin":
{ Args: { "p_team_id": string }; Returns: boolean
                           },
"list_game_scorekeepers":
{ Args: { "p_game_id": string }; Returns: {
              "email": string,"user_id": string
            }[]
                           }
          }
          Enums: {
            "event_type": "shot"|"fb"|"ft"|"ast"|"reb"|"blk"|"stl"|"tov"|"foul"|"sub"|"timeout"|"period"|"void","game_status": "scheduled"|"live"|"final","member_role": "admin"|"scorekeeper"|"coach"|"viewer","position": "G"|"F"|"C","side": "home"|"away","tracking_mode": "full"|"team_only"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "event_type": ["shot", "fb", "ft", "ast", "reb", "blk", "stl", "tov", "foul", "sub", "timeout", "period", "void"],"game_status": ["scheduled", "live", "final"],"member_role": ["admin", "scorekeeper", "coach", "viewer"],"position": ["G", "F", "C"],"side": ["home", "away"],"tracking_mode": ["full", "team_only"]
          }
        }
} as const
