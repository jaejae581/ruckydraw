const COLORS = [
    '#FF6F61', '#6B5B95', '#88B04B', '#F7CAC9', '#92A8D1', // 1-5
    '#955251', '#B565A7', '#009B77', '#DD4124', '#D65076', // 6-10
    '#45B8AC', '#EFC050', '#5B5EA6', '#9B2335', '#DFCFBE', // 11-15
    '#55B4B0', '#E15D44', '#7FCDCD', '#BC243C', '#C3447A', // 16-20
    '#98B4D4', '#FE840E', '#FF5E78', '#4A4E4D', '#A18276', // 21-25
    '#C6A49A', '#777777', '#34568B', '#F1828D', '#66545E', // 26-30
  ];
  
  // 1~30 범위를 벗어나거나 숫자가 아닌 경우 사용할 기본 색상
  const DEFAULT_COLOR = '#808080'; // Gray
  
  /**
   * 공 번호에 따라 지정된 HEX 색상 코드를 반환합니다.
   * @param numberStr 공의 번호 (문자열)
   * @returns HEX 색상 코드
   */
  export const getBallColorByNumber = (numberStr: string): string => {
    const number = parseInt(numberStr, 10);
    if (isNaN(number) || number < 1 || number > COLORS.length) {
      return DEFAULT_COLOR;
    }
    // 배열은 0부터 시작하고 번호는 1부터 시작하므로 1을 빼줍니다.
    return COLORS[number - 1];
  };
  