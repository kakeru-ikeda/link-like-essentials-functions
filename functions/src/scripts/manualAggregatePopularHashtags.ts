import { initializeFirebase } from '@/config/firebase';
import { createDeckService } from '@/presentation/factories/deckServiceFactory';

const main = async (): Promise<void> => {
  initializeFirebase();

  const deckService = createDeckService();

  console.log('人気ハッシュタグ集計を実行します（期間: 30日, 上位: 50件）...');

  const { hashtags, aggregatedAt } =
    await deckService.aggregatePopularHashtags();

  console.log('集計完了');
  console.log(`aggregatedAt: ${aggregatedAt.toDate().toISOString()}`);

  hashtags.forEach((item, index) => {
    console.log(`${index + 1}. ${item.hashtag}: ${item.count}`);
  });
};

main()
  .then(() => {
    console.log('done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  });
