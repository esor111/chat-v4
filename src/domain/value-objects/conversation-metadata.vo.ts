export interface ConversationMetadataData {
  title?: string;
  description?: string;
  avatar?: string;
  settings?: ConversationSettings;
  customData?: Record<string, any>;
}

export interface ConversationSettings {
  muteNotifications?: boolean;
  allowFileSharing?: boolean;
  allowImageSharing?: boolean;
  maxParticipants?: number;
  autoDeleteMessages?: boolean;
  autoDeleteDays?: number;
}

export class ConversationMetadata {
  private static readonly MAX_TITLE_LENGTH = 100;
  private static readonly MAX_DESCRIPTION_LENGTH = 500;
  private static readonly MAX_PARTICIPANTS = 8;

  private constructor(
    public readonly title?: string,
    public readonly description?: string,
    public readonly avatar?: string,
    public readonly settings?: ConversationSettings,
    public readonly customData?: Record<string, any>,
  ) {}

  static create(data: ConversationMetadataData = {}): ConversationMetadata {
    if (data.title && data.title.trim().length > ConversationMetadata.MAX_TITLE_LENGTH) {
      throw new Error(`Conversation title cannot exceed ${ConversationMetadata.MAX_TITLE_LENGTH} characters`);
    }

    if (data.description && data.description.trim().length > ConversationMetadata.MAX_DESCRIPTION_LENGTH) {
      throw new Error(`Conversation description cannot exceed ${ConversationMetadata.MAX_DESCRIPTION_LENGTH} characters`);
    }

    if (data.settings) {
      ConversationMetadata.validateSettings(data.settings);
    }

    return new ConversationMetadata(
      data.title?.trim(),
      data.description?.trim(),
      data.avatar?.trim(),
      data.settings,
      data.customData,
    );
  }

  private static validateSettings(settings: ConversationSettings): void {
    if (settings.maxParticipants !== undefined) {
      if (settings.maxParticipants < 2 || settings.maxParticipants > ConversationMetadata.MAX_PARTICIPANTS) {
        throw new Error(`Max participants must be between 2 and ${ConversationMetadata.MAX_PARTICIPANTS}`);
      }
    }

    if (settings.autoDeleteDays !== undefined) {
      if (settings.autoDeleteDays < 1 || settings.autoDeleteDays > 365) {
        throw new Error('Auto delete days must be between 1 and 365');
      }
    }
  }

  static createDefault(): ConversationMetadata {
    return new ConversationMetadata(
      undefined,
      undefined,
      undefined,
      {
        muteNotifications: false,
        allowFileSharing: true,
        allowImageSharing: true,
        maxParticipants: ConversationMetadata.MAX_PARTICIPANTS,
        autoDeleteMessages: false,
      },
    );
  }

  equals(other: ConversationMetadata): boolean {
    return (
      this.title === other.title &&
      this.description === other.description &&
      this.avatar === other.avatar &&
      JSON.stringify(this.settings) === JSON.stringify(other.settings)
    );
  }

  updateTitle(newTitle: string): ConversationMetadata {
    if (newTitle.trim().length > ConversationMetadata.MAX_TITLE_LENGTH) {
      throw new Error(`Conversation title cannot exceed ${ConversationMetadata.MAX_TITLE_LENGTH} characters`);
    }

    return new ConversationMetadata(
      newTitle.trim(),
      this.description,
      this.avatar,
      this.settings,
      this.customData,
    );
  }

  updateSettings(newSettings: Partial<ConversationSettings>): ConversationMetadata {
    const updatedSettings = { ...this.settings, ...newSettings };
    ConversationMetadata.validateSettings(updatedSettings);

    return new ConversationMetadata(
      this.title,
      this.description,
      this.avatar,
      updatedSettings,
      this.customData,
    );
  }

  hasTitle(): boolean {
    return !!this.title && this.title.length > 0;
  }

  hasAvatar(): boolean {
    return !!this.avatar && this.avatar.length > 0;
  }

  isFileSharingAllowed(): boolean {
    return this.settings?.allowFileSharing !== false;
  }

  isImageSharingAllowed(): boolean {
    return this.settings?.allowImageSharing !== false;
  }

  getMaxParticipants(): number {
    return this.settings?.maxParticipants || ConversationMetadata.MAX_PARTICIPANTS;
  }

  toJSON(): ConversationMetadataData {
    return {
      title: this.title,
      description: this.description,
      avatar: this.avatar,
      settings: this.settings,
      customData: this.customData,
    };
  }
}